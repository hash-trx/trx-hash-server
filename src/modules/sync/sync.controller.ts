/**
 * Sync - Phase 6.3
 * POST /sync/pnl-summary
 */

import { Body, Controller, Post } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private sync: SyncService) {}

  @Post('pnl-summary')
  async pnlSummary(
    @Body('userId') userId: string,
    @Body('date') date: string,
    @Body('totalPnL') totalPnL: number,
    @Body('betCount') betCount: number,
    @Body('checksum') checksum: string,
    @Body('totalBetAmount') totalBetAmount?: number,
  ) {
    if (!userId || !date || !checksum) {
      return { ok: false, error: 'Missing required fields' };
    }
    const total = typeof totalPnL === 'number' ? totalPnL : 0;
    const count = typeof betCount === 'number' ? betCount : 0;
    const betAmt = typeof totalBetAmount === 'number' ? totalBetAmount : undefined;
    return this.sync.syncPnL(userId, date, total, count, checksum, betAmt);
  }
}
