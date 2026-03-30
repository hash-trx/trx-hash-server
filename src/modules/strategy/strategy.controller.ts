import { Body, Controller, Get, Header, Headers, Param, Post } from '@nestjs/common';
import { StrategyService } from './strategy.service';

@Controller('strategies')
export class StrategyController {
  constructor(private readonly strategies: StrategyService) {}

  @Get()
  async list(@Headers('authorization') authHeader?: string) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const items = await this.strategies.list(token || null);
    return { ok: true, items };
  }

  @Get(':id')
  async detail(@Param('id') id: string, @Headers('authorization') authHeader?: string) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const item = await this.strategies.getById(Number(id), token || null);
    if (!item) return { ok: false, error: 'Not found' };
    return { ok: true, item };
  }

  @Get(':id/script')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async script(@Param('id') id: string) {
    const code = await this.strategies.getScriptById(Number(id));
    if (!code) return '// Not found';
    return code;
  }

  /** 每选用一次，计一次使用（收费策略会扣减剩余次数） */
  @Post(':id/use')
  async use(@Param('id') id: string, @Headers('authorization') authHeader: string) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return { ok: false, error: 'No token' };
    return await this.strategies.incrementUse(Number(id), token);
  }

  /** 购买：提交 txid，核验链上付款后增加购买次数 */
  @Post(':id/purchase-by-txid')
  async purchaseByTxid(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
    @Body('txid') txid: string,
  ) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return { ok: false, error: 'No token' };
    return await this.strategies.purchaseByTxid(Number(id), token, txid || '');
  }
}

