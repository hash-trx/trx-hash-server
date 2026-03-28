import { Module } from '@nestjs/common';
import { BlockHashController } from './block-hash.controller';
import { BlockHashIngestService } from './block-hash-ingest.service';

@Module({
  controllers: [BlockHashController],
  providers: [BlockHashIngestService],
})
export class BlockHashModule {}
