/**
 * Sync - Phase 6.3 盈亏同步
 * POST /sync/pnl-summary, HMAC 校验
 */

import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const HMAC_SECRET = process.env.PNL_SYNC_SECRET || 'trx-hash-pnl-sync-dev';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  verifyChecksum(userId: string, date: string, totalPnL: number, betCount: number, checksum: string): boolean {
    const payload = `${userId}|${date}|${totalPnL}|${betCount}`;
    const expected = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(checksum, 'hex'), Buffer.from(expected, 'hex'));
  }

  async syncPnL(
    userId: string,
    date: string,
    totalPnL: number,
    betCount: number,
    checksum: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.verifyChecksum(userId, date, totalPnL, betCount, checksum)) {
      return { ok: false, error: 'Invalid checksum' };
    }

    const uid = parseInt(userId, 10);
    if (isNaN(uid)) return { ok: false, error: 'Invalid userId' };

    await this.prisma.user.update({
      where: { id: uid },
      data: { pnlTotal: { increment: totalPnL } },
    });

    return { ok: true };
  }
}
