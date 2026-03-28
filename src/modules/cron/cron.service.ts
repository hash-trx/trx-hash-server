/**
 * Cron - Phase 6.2 订阅激活
 * 监听 SUB_ADDRESS 转入，精确匹配激活金额（测试可改为 1 TRX），memo 存邮箱，更新 User.subExpire +30d
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TronWeb } from 'tronweb';

const DEFAULT_FULL_HOST = 'http://3.225.171.164:8090';
const ACTIVATION_AMOUNT_SUN = 1 * 1e6;

type TronGridTx = {
  txID?: string;
  transaction_id?: string;
  block_timestamp?: number;
  ret?: Array<{ contractRet?: string }>;
  raw_data?: {
    timestamp?: number;
    contract?: Array<{
      type?: string;
      parameter?: { value?: { amount?: number | string; to_address?: string; data?: string } };
    }>;
  };
};

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private tronWeb: TronWeb;
  private warnedReadUnsupported = false;

  constructor(private prisma: PrismaService) {
    const fullHost = (process.env.TRON_FULL_HOST || '').trim() || DEFAULT_FULL_HOST;
    this.tronWeb = new TronWeb({ fullHost });
  }

  /** 尝试通过 FullNode 拉取地址相关交易；若节点不支持则返回空，避免影响主业务。 */
  private async fetchAccountTransactions(subBase58: string): Promise<TronGridTx[]> {
    try {
      const txs = (await this.tronWeb.trx.getTransactionsToAddress(subBase58, 50, 0)) as TronGridTx[] | undefined;
      return Array.isArray(txs) ? txs : [];
    } catch (e) {
      if (!this.warnedReadUnsupported) {
        this.warnedReadUnsupported = true;
        this.logger.warn(
          `当前 FullNode 不支持地址交易查询，自动激活轮询暂时跳过（不影响手动 txid 激活）。${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
      return [];
    }
  }

  private parseTransferContract(
    tx: TronGridTx,
  ): { txid: string; ts: number; amount: number; toAddress: string; memo: string } | null {
    const txid = tx.txID ?? tx.transaction_id ?? '';
    if (!txid) return null;
    const cr = tx.ret?.[0]?.contractRet;
    if (cr && cr !== 'SUCCESS') return null;

    const ts = tx.block_timestamp ?? tx.raw_data?.timestamp ?? 0;
    const contracts = tx.raw_data?.contract;
    if (!Array.isArray(contracts)) return null;
    const c = contracts.find((x) => x.type === 'TransferContract');
    const v = c?.parameter?.value;
    if (!v?.to_address) return null;

    const amount = Number(v.amount);
    let memo = '';
    if (typeof v.data === 'string' && v.data.length > 0) {
      try {
        memo = Buffer.from(v.data, 'hex').toString('utf8').replace(/\0/g, '').trim();
      } catch {
        memo = '';
      }
    }
    if (!memo && tx.raw_data && typeof (tx.raw_data as { data?: string }).data === 'string') {
      try {
        const h = (tx.raw_data as { data: string }).data;
        memo = Buffer.from(h, 'hex').toString('utf8').replace(/\0/g, '').trim();
      } catch {
        //
      }
    }
    return { txid, ts, amount, toAddress: v.to_address, memo };
  }

  @Cron('*/1 * * * *') // 每分钟整点跑一轮（另受链上确认延迟影响，一般 1～2 分钟内可见）
  async checkActivationPayments() {
    const addr = process.env.SUB_ADDRESS?.trim();
    if (!addr) return;

    const list = await this.fetchAccountTransactions(addr);

    const subHex = this.tronWeb.address.toHex(addr);
    const now = Date.now();

    for (const tx of list) {
      const parsed = this.parseTransferContract(tx);
      if (!parsed) continue;

      const toHex = this.tronWeb.address.toHex(parsed.toAddress);
      if (toHex !== subHex) continue;

      if (now - parsed.ts > 24 * 60 * 60 * 1000) continue;
      if (parsed.amount !== ACTIVATION_AMOUNT_SUN) continue;

      const email = parsed.memo.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

      const existing = await this.prisma.activationLog.findUnique({ where: { txid: parsed.txid } });
      if (existing) continue;

      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) continue;

      const base = user.subExpire && user.subExpire > new Date() ? user.subExpire : new Date();
      const newExpire = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

      try {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: user.id },
            data: { subExpire: newExpire },
          }),
          this.prisma.activationLog.create({
            data: { txid: parsed.txid },
          }),
        ]);
      } catch (e) {
        this.logger.warn(`[activate tx ${parsed.txid}] ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}
