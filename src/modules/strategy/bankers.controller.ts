import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { StrategyService } from './strategy.service';

@Controller('bankers')
export class BankersController {
  constructor(private readonly strategy: StrategyService) {}

  @Get()
  async list() {
    const items = await this.strategy.listBankers();
    return { ok: true, items };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const item = await this.strategy.getBankerDetail(id);
    if (!item) throw new NotFoundException('Banker not found');
    return { ok: true, item };
  }
}
