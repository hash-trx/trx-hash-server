import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { SyncModule } from './modules/sync/sync.module';
import { CronModule } from './modules/cron/cron.module';
import { BlockHashModule } from './modules/block-hash/block-hash.module';
import { TronModule } from './modules/tron/tron.module';
import { AdminModule } from './modules/admin/admin.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { StakingPresetsModule } from './modules/staking-presets/staking-presets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Support running from workspace root and package root.
      envFilePath: ['apps/nestjs-server/.env', '.env'],
    }),
    PrismaModule,
    AuthModule,
    StrategyModule,
    SyncModule,
    CronModule,
    BlockHashModule,
    TronModule,
    FeedbackModule,
    AdminModule,
    StakingPresetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
