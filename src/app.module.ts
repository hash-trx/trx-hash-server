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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
