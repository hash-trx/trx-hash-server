import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TronWeb } from 'tronweb';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_FULL_HOST = 'http://3.225.171.164:8090';

@Injectable()
export class StrategyService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    // 默认内置 2 条策略（可重复执行，不会重复插入）
    const defaults = [
      {
        id: 1,
        name: '顺势轻仓（免费）',
        price: 0,
        scriptUrl: '/strategies/1/script',
        isHot: true,
      },
      {
        id: 2,
        name: '马丁倍投（收费）',
        price: 99,
        scriptUrl: '/strategies/2/script',
        isHot: false,
      },
    ] as const;

    await this.prisma.strategyMarket.createMany({
      data: defaults as any,
      skipDuplicates: true,
    });
  }

  async listBankers(): Promise<
    Array<{
      id: number
      name: string
      address: string
      odds: number
      rebate: number
      note?: string
    }>
  > {
    const rows = await this.prisma.marketBanker.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      odds: r.odds,
      rebate: r.rebate,
      note: r.note ?? undefined,
    }));
  }

  async getBankerDetail(
    id: number,
  ): Promise<{
    id: number
    name: string
    address: string
    odds: number
    rebate: number
    note?: string
    description?: string
  } | null> {
    const r = await this.prisma.marketBanker.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      address: r.address,
      odds: r.odds,
      rebate: r.rebate,
      note: r.note ?? undefined,
      description: r.description ?? undefined,
    };
  }

  async list(token: string | null = null): Promise<
    Array<{
      id: number;
      name: string;
      price: number;
      scriptUrl: string;
      isHot: boolean;
      userPurchased?: number;
      userUsed?: number;
      userRemaining?: number;
    }>
  > {
    const rows = await this.prisma.strategyMarket.findMany({
      orderBy: [{ isHot: 'desc' }, { id: 'asc' }],
    });
    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      scriptUrl: r.scriptUrl,
      isHot: r.isHot,
    }));

    const userId = this.getUserIdFromToken(token);
    if (!userId) return items;
    const ids = items.map((x) => x.id);
    const { purchaseMap, usedMap } = await this.getCounts(userId, ids);
    return items.map((it) => {
      const purchased = purchaseMap.get(it.id) ?? 0;
      const used = usedMap.get(it.id) ?? 0;
      const remaining = it.price > 0 ? Math.max(0, purchased - used) : 999999;
      return { ...it, userPurchased: purchased, userUsed: used, userRemaining: remaining };
    });
  }

  private getUserIdFromToken(token: string | null): number | null {
    if (!token) return null;
    try {
      const payload = this.jwt.verify(token) as { sub: string };
      const id = parseInt(payload.sub, 10);
      return id || null;
    } catch {
      return null;
    }
  }

  private async getCounts(userId: number, strategyIds: number[]) {
    const purchases = await this.prisma.strategyPurchase.groupBy({
      by: ['strategyId'],
      where: { userId, strategyId: { in: strategyIds } },
      _count: { txid: true },
    });
    const usage = await this.prisma.strategyUsage.findMany({
      where: { userId, strategyId: { in: strategyIds } },
      select: { strategyId: true, usedCount: true },
    });
    const purchaseMap = new Map<number, number>();
    const usedMap = new Map<number, number>();
    for (const p of purchases as any[]) purchaseMap.set(p.strategyId, p._count?.txid ?? 0);
    for (const u of usage) usedMap.set(u.strategyId, u.usedCount ?? 0);
    return { purchaseMap, usedMap };
  }

  // (list(token?) 已在上方实现)

  async getById(
    id: number,
    token: string | null = null,
  ): Promise<{
    id: number;
    name: string;
    price: number;
    scriptUrl: string;
    isHot: boolean;
    description?: string;
    entry?: string[];
    notes?: string[];
    userPurchased?: number;
    userUsed?: number;
    userRemaining?: number;
  } | null> {
    if (!Number.isFinite(id)) return null;
    const r = await this.prisma.strategyMarket.findUnique({ where: { id } });
    if (!r) return null;
    const base = { id: r.id, name: r.name, price: r.price, scriptUrl: r.scriptUrl, isHot: r.isHot };
    const meta =
      id === 1
        ? {
            description: '示例免费策略：根据路单趋势做轻仓下注。',
            entry: ['当出现连续趋势时顺势轻仓下注（示例脚本）。'],
            notes: ['仅示例，不构成投资建议。请自行控制风险。'],
          }
        : id === 2
          ? {
              description: '示例收费策略：马丁倍投逻辑（高风险）。',
              entry: ['每次下注；亏损后加倍，盈利后回到基数（示例）。'],
              notes: ['风险极高，容易爆仓；请谨慎。'],
            }
          : { description: '', entry: [], notes: [] };

    const userId = this.getUserIdFromToken(token);
    if (!userId) return { ...base, ...meta };
    const { purchaseMap, usedMap } = await this.getCounts(userId, [id]);
    const purchased = purchaseMap.get(id) ?? 0;
    const used = usedMap.get(id) ?? 0;
    const remaining = r.price > 0 ? Math.max(0, purchased - used) : 999999;
    return { ...base, ...meta, userPurchased: purchased, userUsed: used, userRemaining: remaining };
  }

  private async fetchTxById(txid: string): Promise<{ ok: true; tx: any } | { ok: false; error: string }> {
    const t = (txid || '').trim();
    if (!/^[0-9a-fA-F]{64}$/.test(t)) return { ok: false, error: 'txid 格式不正确（应为 64 位十六进制）' };
    try {
      const fullHost = (process.env.TRON_FULL_HOST || '').trim() || DEFAULT_FULL_HOST;
      const tw = new TronWeb({ fullHost });
      const tx = await tw.trx.getTransaction(t);
      if (tx) return { ok: true, tx };
    } catch {
      //
    }
    return { ok: false, error: '未找到该交易或尚未可查（可能未确认/延迟/测试网）' };
  }

  async purchaseByTxid(
    strategyId: number,
    token: string,
    txid: string,
  ): Promise<{ ok: true; userPurchased: number; userRemaining: number } | { ok: false; error: string }> {
    const userId = this.getUserIdFromToken(token);
    if (!userId) return { ok: false, error: 'Invalid token' };
    const item = await this.prisma.strategyMarket.findUnique({ where: { id: strategyId } });
    if (!item) return { ok: false, error: 'Not found' };
    if (item.price <= 0) return { ok: false, error: '免费策略无需购买' };

    const payAddress = (process.env.STRATEGY_PAY_ADDRESS || process.env.SUB_ADDRESS || '').trim();
    if (!payAddress) return { ok: false, error: 'Pay address not configured' };

    const f = await this.fetchTxById(txid);
    if (!f.ok) return f;
    const tx = f.tx;
    const realTxid = (tx.txID || tx.txid || '').trim();
    if (!realTxid) return { ok: false, error: '交易解析失败' };

    const existing = await this.prisma.strategyPurchase.findUnique({ where: { txid: realTxid } });
    if (existing) return { ok: false, error: '该 txid 已用于购买' };

    const cr = tx.ret?.[0]?.contractRet;
    if (cr && cr !== 'SUCCESS') return { ok: false, error: `交易状态异常：${cr}` };
    const contracts = tx.raw_data?.contract;
    if (!Array.isArray(contracts)) return { ok: false, error: '交易数据不完整' };
    const c = contracts.find((x: any) => x.type === 'TransferContract');
    const v = c?.parameter?.value;
    if (!v?.to_address) return { ok: false, error: '仅支持 TRX 转账购买' };

    const fullHost = (process.env.TRON_FULL_HOST || '').trim() || DEFAULT_FULL_HOST;
    const tw = new TronWeb({ fullHost });
    const expectedToHex = tw.address.toHex(payAddress);
    const actualToHex = tw.address.toHex(v.to_address);
    if (actualToHex !== expectedToHex) return { ok: false, error: '收款地址不匹配' };

    const amount = Number(v.amount ?? 0);
    const expected = Math.floor(item.price * 1e6);
    if (amount !== expected) return { ok: false, error: `金额不匹配（需精确 ${item.price} TRX）` };

    await this.prisma.strategyPurchase.create({
      data: {
        txid: realTxid,
        userId,
        strategyId,
        amountTrx: item.price,
      },
    });

    const purchased = await this.prisma.strategyPurchase.count({ where: { userId, strategyId } });
    const used = (await this.prisma.strategyUsage.findUnique({ where: { userId_strategyId: { userId, strategyId } } }))?.usedCount ?? 0;
    return { ok: true, userPurchased: purchased, userRemaining: Math.max(0, purchased - used) };
  }

  async incrementUse(
    strategyId: number,
    token: string,
  ): Promise<{ ok: true; userUsed: number; userRemaining: number } | { ok: false; error: string }> {
    const userId = this.getUserIdFromToken(token);
    if (!userId) return { ok: false, error: 'Invalid token' };
    const item = await this.prisma.strategyMarket.findUnique({ where: { id: strategyId } });
    if (!item) return { ok: false, error: 'Not found' };

    if (item.price > 0) {
      const purchased = await this.prisma.strategyPurchase.count({ where: { userId, strategyId } });
      const usedRow = await this.prisma.strategyUsage.findUnique({
        where: { userId_strategyId: { userId, strategyId } },
      });
      const used = usedRow?.usedCount ?? 0;
      if (purchased - used <= 0) return { ok: false, error: '次数不足：请先购买' };
    }

    const row = await this.prisma.strategyUsage.upsert({
      where: { userId_strategyId: { userId, strategyId } },
      create: { userId, strategyId, usedCount: 1 },
      update: { usedCount: { increment: 1 } },
      select: { usedCount: true },
    });
    const purchased = item.price > 0 ? await this.prisma.strategyPurchase.count({ where: { userId, strategyId } }) : 999999;
    const remaining = item.price > 0 ? Math.max(0, purchased - row.usedCount) : 999999;
    return { ok: true, userUsed: row.usedCount, userRemaining: remaining };
  }

  getScriptById(id: number): string | null {
    if (id === 1) {
      return `/**
 * 顺势轻仓（示例）
 * - 仅做演示：根据单双连续性做轻仓下注
 * - 真实策略请结合你的资金管理/止盈止损
 */

let last = null;
let streak = 0;

module.exports.onBlock = async function onBlock(result) {
  // result: { type: 'SINGLE'|'DOUBLE', digit, isOdd, isBig, ... }
  const cur = result.type;
  if (last === cur) streak += 1;
  else streak = 1;
  last = cur;

  // 连续 >=2 次，顺势轻仓
  if (streak >= 2) {
    const amt = Number(config?.betAmount ?? config?.baseAmount ?? 1) || 1;
    await bet(amt);
  }
};
`;
    }

    if (id === 2) {
      return `/**
 * 马丁倍投（示例）
 * - 仅做演示：亏损后翻倍，盈利后回到基数
 * - 风险极高：请谨慎使用
 */

let nextAmount = null;

module.exports.onBlock = async function onBlock(_result) {
  const base = Number(config?.betAmount ?? config?.baseAmount ?? 1) || 1;
  const maxBet = Number(config?.maxBet ?? 128) || 128;

  if (nextAmount == null) nextAmount = base;

  // 简化逻辑：每次都下注；输赢结果由系统回调更新 nextAmount（这里只示例）
  const amt = Math.min(nextAmount, maxBet);
  await bet(amt);
};

// 可选：如果你的沙箱支持接收上一笔 profit，可以在这里根据盈亏调整 nextAmount
// module.exports.onBetResult = function ({ profit }) { ... }
`;
    }

    return null;
  }
}

