/**
 * Auth - 注册后密码登录（不再支持仅凭验证码登录/自动建号）
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password.util';

const DEFAULT_FULL_HOST = 'http://3.225.171.164:8090';

export interface LoginResult {
  userId: string;
  token: string;
  subExpire: Date | null;
}

type TronGridTxById = {
  txID?: string;
  ret?: Array<{ contractRet?: string }>;
  raw_data?: {
    contract?: Array<{
      type?: string;
      parameter?: { value?: { amount?: number | string; to_address?: string; data?: string } };
    }>;
  };
};

type AnyTx = {
  txID?: string;
  txid?: string;
  ret?: Array<{ contractRet?: string }>;
  raw_data?: any;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const e = (email || '').trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return { ok: false, error: '邮箱格式不正确' };
    }
    if (!password || password.length < 8) {
      return { ok: false, error: '密码至少 8 位' };
    }
    const exists = await this.prisma.user.findUnique({ where: { email: e } });
    if (exists) {
      return { ok: false, error: '该邮箱已注册，请直接登录' };
    }
    const passwordHash = hashPassword(password);
    await this.prisma.user.create({
      data: { email: e, passwordHash, subExpire: null },
    });
    return { ok: true };
  }

  /** 已登录态下校验登录密码（用于客户端敏感操作，如改钱包密码） */
  async verifyLoginPassword(token: string, password: string): Promise<boolean> {
    try {
      const payload = this.jwt.verify(token) as { sub: string };
      const user = await this.prisma.user.findUnique({
        where: { id: parseInt(payload.sub, 10) },
      });
      if (!user?.passwordHash) return false;
      return verifyPassword(password, user.passwordHash);
    } catch {
      return false;
    }
  }

  async login(email: string, password: string): Promise<LoginResult | null> {
    const e = (email || '').trim().toLowerCase();
    if (!e || !password) return null;

    const user = await this.prisma.user.findUnique({ where: { email: e } });
    if (!user?.passwordHash) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;

    const payload = { sub: String(user.id), email: user.email };
    const token = this.jwt.sign(payload);
    return {
      userId: String(user.id),
      token,
      subExpire: user.subExpire,
    };
  }

  /** 仅校验 JWT 签名与有效期（不查库），供中继广播等接口使用 */
  validateJwt(token: string): { userId: string } | null {
    try {
      const payload = this.jwt.verify(token) as { sub?: string };
      const sub = payload?.sub;
      if (sub == null || sub === '') return null;
      return { userId: String(sub) };
    } catch {
      return null;
    }
  }

  async getStatus(token: string): Promise<{
    userId: string;
    isExpired: boolean;
    serverTime: number;
    subExpire: Date | null;
  } | null> {
    try {
      const payload = this.jwt.verify(token) as { sub: string; email: string };
      const user = await this.prisma.user.findUnique({
        where: { id: parseInt(payload.sub, 10) },
      });
      if (!user) return null;

      const now = new Date();
      const isExpired = user.subExpire ? user.subExpire < now : true;

      return {
        userId: String(user.id),
        isExpired,
        serverTime: now.getTime(),
        subExpire: user.subExpire,
      };
    } catch {
      return null;
    }
  }

  async getSubscriptionInfo(token: string): Promise<{
    payAddress: string;
    amountTrx: number;
    memoHint: string;
    chain: 'TRON';
  } | null> {
    try {
      this.jwt.verify(token) as { sub: string; email: string };

      const payAddress = process.env.SUB_ADDRESS?.trim();
      if (!payAddress) return null;
      return {
        payAddress,
        amountTrx: 1,
        memoHint: 'Memo 必须与当前登录邮箱完全一致（区分大小写不敏感）。用于把付款绑定到你的账号，防止他人用你的 txid 激活。',
        chain: 'TRON',
      };
    } catch {
      return null;
    }
  }

  private async fetchTxById(txid: string): Promise<
    | { ok: true; tx: AnyTx }
    | { ok: false; error: string }
  > {
    const t = (txid || '').trim();
    if (!/^[0-9a-fA-F]{64}$/.test(t)) {
      return { ok: false, error: 'txid 格式不正确（应为 64 位十六进制）' };
    }

    // 仅使用 FullNode，不再依赖 TronGrid
    try {
      const { TronWeb } = await import('tronweb');
      const fullHost = (process.env.TRON_FULL_HOST || '').trim() || DEFAULT_FULL_HOST;
      const tw = new TronWeb({
        fullHost,
      });
      const tx = (await tw.trx.getTransaction(t)) as AnyTx;
      if (tx?.txID || tx?.txid) return { ok: true, tx };
    } catch {
      // ignore
    }

    return {
      ok: false,
      error: '未找到该交易或尚未可查。常见原因：链上未确认（等 10–60 秒）或你转的是测试网（Nile/Shasta）txid（本服务只查主网）。',
    };
  }

  /** 从 hex 解析 UTF-8 备注 */
  private parseTrxTransferMemo(data: string | undefined): string {
    if (typeof data !== 'string' || data.length === 0) return '';
    try {
      return Buffer.from(data, 'hex').toString('utf8').replace(/\0/g, '').trim();
    } catch {
      return '';
    }
  }

  /**
   * TRX 转账备注可能出现在两处（钱包版本不同）：
   * - `parameter.value.data`（旧）
   * - `raw_data.data`（新，与 TronScan「备注」常见展示一致）
   */
  private resolveTransferMemo(tx: AnyTx, valueData: string | undefined): string {
    const a = this.parseTrxTransferMemo(valueData);
    if (a) return a;
    const rd = (tx as { raw_data?: { data?: string } }).raw_data;
    return this.parseTrxTransferMemo(rd?.data);
  }

  /**
   * 方案 A：提交 txid 立即激活
   * - 用 token 定位用户；链上 Memo 必须与该用户邮箱一致，否则他人拿到 txid 也无法盗刷续期
   * - 核验：收款地址=SUB_ADDRESS、金额=1 TRX、交易成功、Memo=登录邮箱
   * - 去重：activation_log(txid) 已存在则拒绝
   */
  async activateByTxid(
    token: string,
    txid: string,
  ): Promise<
    | { ok: true; subExpire: Date }
    | { ok: false; error: string }
  > {
    let userId = 0;
    try {
      const payload = this.jwt.verify(token) as { sub: string; email?: string };
      userId = parseInt(payload.sub, 10);
      if (!userId) return { ok: false, error: 'Invalid token' };
    } catch {
      return { ok: false, error: 'Invalid token' };
    }

    const addr = process.env.SUB_ADDRESS?.trim();
    if (!addr) return { ok: false, error: 'SUB_ADDRESS not configured' };

    const f = await this.fetchTxById(txid);
    if (!f.ok) return f;
    const tx = f.tx as TronGridTxById;

    const id = ((tx as any).txID || (tx as any).txid || '').trim();
    if (!id) return { ok: false, error: '交易解析失败' };

    const existing = await this.prisma.activationLog.findUnique({ where: { txid: id } });
    if (existing) return { ok: false, error: '该交易已用于激活' };

    const cr = tx.ret?.[0]?.contractRet;
    if (cr && cr !== 'SUCCESS') return { ok: false, error: `交易状态异常：${cr}` };

    const contracts = tx.raw_data?.contract;
    if (!Array.isArray(contracts)) return { ok: false, error: '交易数据不完整' };
    const c = contracts.find((x) => x.type === 'TransferContract');
    const v = c?.parameter?.value;
    if (!v?.to_address) return { ok: false, error: '仅支持 TRX 转账交易' };

    // to_address 可能是 hex 地址（41...），统一转 hex 比较。
    // 延迟 import，避免启动时开销。
    const { TronWeb } = await import('tronweb');
    const fullHost = (process.env.TRON_FULL_HOST || '').trim() || DEFAULT_FULL_HOST;
    const tw = new TronWeb({ fullHost });
    const expectedToHex = tw.address.toHex(addr);
    const actualToHex = tw.address.toHex(v.to_address);
    if (actualToHex !== expectedToHex) return { ok: false, error: '收款地址不匹配' };

    const amount = Number(v.amount ?? 0);
    if (amount !== 1 * 1e6) return { ok: false, error: '金额不匹配（需精确 1 TRX）' };

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { ok: false, error: '用户不存在' };

    const memoOnChain = this.resolveTransferMemo(tx, v.data as string | undefined).toLowerCase();
    const emailExpected = (user.email || '').trim().toLowerCase();
    if (!memoOnChain) {
      return {
        ok: false,
        error:
          '链上该笔 TRX 转账的「备注」字段为空（未写入 data）。请在 TronScan 打开该 txid，查看 Raw Data 里是否有备注；部分钱包界面有「备注」但未写入主网转账，请换 TronLink 等钱包重新转 1 TRX 并填写与登录邮箱完全一致的 Memo。',
      };
    }
    if (memoOnChain !== emailExpected) {
      return {
        ok: false,
        error: `Memo 与当前登录邮箱不一致。链上备注为「${memoOnChain.slice(0, 80)}${memoOnChain.length > 80 ? '…' : ''}」，当前账号邮箱为「${emailExpected}」。请核对是否多空格、全角符号或未用注册时的邮箱登录。`,
      };
    }
    const base = user.subExpire && user.subExpire > new Date() ? user.subExpire : new Date();
    const newExpire = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { subExpire: newExpire },
      }),
      this.prisma.activationLog.create({
        data: { txid: id },
      }),
    ]);

    return { ok: true, subExpire: newExpire };
  }
}
