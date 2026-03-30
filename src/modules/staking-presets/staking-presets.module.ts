import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StakingPresetsController } from './staking-presets.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StakingPresetsController],
})
export class StakingPresetsModule {}

