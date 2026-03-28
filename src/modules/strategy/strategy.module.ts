import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BankersController } from './bankers.controller';
import { StrategyController } from './strategy.controller';
import { StrategyService } from './strategy.service';

// Phase 1 实现: 策略列表、scriptUrl 下发
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'trx-hash-dev-secret',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [StrategyController, BankersController],
  providers: [StrategyService],
})
export class StrategyModule {}
