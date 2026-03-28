/**
 * Sync - Phase 6.3 盈亏同步
 * POST /sync/pnl-summary, HMAC 校验
 */

import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const HMAC_SECRET = process.env.PNL_SYNC_SECRET || 'trx-hash-pnl-sync-dev';

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  verifyChecksum(
    userId: string,
    date: string,
    totalPnL: number,
    betCount: number,
    checksum: string,
    totalBetAmount?: number,
  ): boolean {
    const payloadOld = `${userId}|${date}|${totalPnL}|${betCount}`;
    const expectedOld = crypto.createHmac('sha256', HMAC_SECRET).update(payloadOld).digest('hex');
    if (timingSafeEqualHex(checksum, expectedOld)) return true;
    if (totalBetAmount !== undefined && typeof totalBetAmount === 'number' && !Number.isNaN(totalBetAmount)) {
      const payloadNew = `${userId}|${date}|${totalPnL}|${betCount}|${totalBetAmount}`;
      const expectedNew = crypto.createHmac('sha256', HMAC_SECRET).update(payloadNew).digest('hex');
      return timingSafeEqualHex(checksum, expectedNew);
    }
    return false;
  }

  async syncPnL(
    userId: string,
    date: string,
    totalPnL: number,
    betCount: number,
    checksum: string,
    totalBetAmount?: number,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.verifyChecksum(userId, date, totalPnL, betCount, checksum, totalBetAmount)) {
      return { ok: false, error: 'Invalid checksum' };
    }

    const uid = parseInt(userId, 10);
    if (isNaN(uid)) return { ok: false, error: 'Invalid userId' };

    const betAmt = totalBetAmount !== undefined && typeof totalBetAmount === 'number' ? totalBetAmount : 0;

    await this.prisma.user.update({
      where: { id: uid },
      data: {
        pnlTotal: { increment: totalPnL },
        betCountTotal: { increment: betCount },
        betAmountTotal: { increment: betAmt },
      },
    });

    return { ok: true };
  }
}
