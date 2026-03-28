/**
 * POST /tron/broadcast-transaction — 代广播已签名 TRX 交易（需登录 JWT）
 */

import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { TronBroadcastService } from './tron-broadcast.service';

@Controller('tron')
export class TronBroadcastController {
  private readonly log = new Logger(TronBroadcastController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly tronBroadcast: TronBroadcastService,
  ) {}

  @Post('broadcast-transaction')
  async broadcastTransaction(
    @Headers('authorization') authHeader: string,
    @Body() body: { transaction?: Record<string, unknown> },
  ) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      this.log.warn('broadcast: missing Authorization');
      return { ok: false, error: 'No token' };
    }
    const session = this.auth.validateJwt(token);
    if (!session) {
      this.log.warn('broadcast: invalid or expired JWT');
      return { ok: false, error: 'Invalid token' };
    }

    const tx = body?.transaction;
    if (!tx || typeof tx !== 'object') {
      return { ok: false, error: 'Missing transaction' };
    }

    if (!this.tronBroadcast.hasKeys()) {
      this.log.warn('broadcast: TRONGRID_API_KEYS not configured');
      return { ok: false, error: 'TRONGRID_API_KEYS 未配置' };
    }

    const r = await this.tronBroadcast.broadcastTransaction(tx);
    if (r.ok) {
      this.log.log(`broadcast ok user=${session.userId} txid=${r.txid}`);
      return { ok: true, txid: r.txid };
    }
    this.log.warn(`broadcast fail user=${session.userId}: ${r.error}`);
    return { ok: false, error: r.error };
  }
}
