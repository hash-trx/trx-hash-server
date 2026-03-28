import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TronWeb } from 'tronweb';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDigitFromBlockHash } from '../../common/parse-block-hash';

const DEFAULT_FULL_HOST = 'http://3.225.171.164:8090';
/** 超过该条数时删除更旧记录（保留最近 N 条） */
const MAX_ROWS = 1_000_000;

@Injectable()
export class BlockHashIngestService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(BlockHashIngestService.name);
  private tronWeb: TronWeb;
  private cursorHeight = 0;
  private inFlight = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private readonly tickMs: number;
  private readonly gapDelayMs: number;
  private readonly maxGapPerTick: number;

  constructor(private readonly prisma: PrismaService) {
    const fullHost = (process.env.TRON_FULL_HOST || '').trim() || DEFAULT_FULL_HOST;
    this.tronWeb = new TronWeb({ fullHost });
    this.tickMs = 3000;
    this.gapDelayMs = 120;
    this.maxGapPerTick = 40;
  }

  async onModuleInit() {
    const row = await this.prisma.blockHashLog.findFirst({
      orderBy: { height: 'desc' },
      select: { height: true },
    });
    this.cursorHeight = row?.height ?? 0;
    this.log.log(
      `Block hash ingest cursor=${this.cursorHeight}, maxRows=${MAX_ROWS}, tickMs=${this.tickMs}, maxGap=${this.maxGapPerTick}`,
    );
    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, this.tickMs);
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async tick() {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      await this.syncLatest();
    } catch (e) {
      this.log.warn(`sync failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.inFlight = false;
    }
  }

  private async syncLatest() {
    const latestBlock = (await this.tronWeb.trx.getBlock('latest')) as {
      blockID?: string;
      block_header?: { raw_data?: { number?: number } };
    } | null;
    if (!latestBlock?.blockID) return;

    const latestNum = latestBlock.block_header?.raw_data?.number ?? 0;
    if (!latestNum) return;

    if (this.cursorHeight === 0) {
      await this.upsertOne(latestNum, latestBlock.blockID);
      this.cursorHeight = latestNum;
      await this.trimOldRows();
      return;
    }

    if (latestNum <= this.cursorHeight) return;

    const end = Math.min(latestNum, this.cursorHeight + this.maxGapPerTick);

    for (let h = this.cursorHeight + 1; h <= end; h++) {
      try {
        const b = (await this.tronWeb.trx.getBlock(h)) as {
          blockID?: string;
        } | null;
        if (b?.blockID) {
          await this.upsertOne(h, b.blockID);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.log.warn(`getBlock ${h}: ${msg}`);
        if (msg.includes('429') || msg.includes('rate')) {
          await this.sleep(5000);
        }
        break;
      }
      if (h < end) await this.sleep(this.gapDelayMs);
    }
    this.cursorHeight = end;
    await this.trimOldRows();
  }

  private async upsertOne(height: number, blockId: string) {
    const digit = parseDigitFromBlockHash(blockId);
    await this.prisma.blockHashLog.upsert({
      where: { height },
      create: { height, blockId, digit },
      update: { blockId, digit },
    });
  }

  private async trimOldRows() {
    const count = await this.prisma.blockHashLog.count();
    if (count <= MAX_ROWS) return;

    const threshold = await this.prisma.blockHashLog.findFirst({
      orderBy: { height: 'desc' },
      skip: MAX_ROWS - 1,
      take: 1,
      select: { height: true },
    });
    if (!threshold) return;

    const deleted = await this.prisma.blockHashLog.deleteMany({
      where: { height: { lt: threshold.height } },
    });
    if (deleted.count > 0) {
      this.log.log(`trim block_hash_log: removed ${deleted.count} rows (keep latest ${MAX_ROWS})`);
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
