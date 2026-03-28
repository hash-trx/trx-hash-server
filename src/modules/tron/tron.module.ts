import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TronBroadcastController } from './tron-broadcast.controller';
import { TronBroadcastService } from './tron-broadcast.service';

@Module({
  imports: [AuthModule],
  controllers: [TronBroadcastController],
  providers: [TronBroadcastService],
  exports: [TronBroadcastService],
})
export class TronModule {}
