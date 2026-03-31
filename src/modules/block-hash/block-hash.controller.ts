import { Controller, Get, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('blocks')
export class BlockHashController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 云端优先：返回最近一次写入的最新区块（由 BlockHashIngestService 持续同步到 block_hash_log）
   */
  @Get('latest')
  async latest() {
    const row = await this.prisma.blockHashLog.findFirst({
      orderBy: { height: 'desc' },
      select: { height: true, blockId: true, digit: true, createdAt: true },
    });
    if (!row) return { ok: false, error: 'no block yet' };
    return {
      ok: true,
      item: {
        height: row.height,
        blockId: row.blockId,
        digit: row.digit,
        createdAt: row.createdAt,
      },
    };
  }

  /**
   * 云端优先：按高度取块；height<=0 或缺省时等同 latest
   */
  @Get('block')
  async block(@Query('height') heightRaw?: string) {
    const h = Math.floor(parseInt(heightRaw ?? '-1', 10) || -1);
    if (h <= 0) return this.latest();
    const row = await this.prisma.blockHashLog.findUnique({
      where: { height: h },
      select: { height: true, blockId: true, digit: true, createdAt: true },
    });
    if (!row) return { ok: false, error: 'not found', height: h };
    return {
      ok: true,
      item: {
        height: row.height,
        blockId: row.blockId,
        digit: row.digit,
        createdAt: row.createdAt,
      },
    };
  }

  /**
   * 路单用：只返回落在「区块间隔」网格上的高度（与客户端 shouldEmit: height % interval === 0 一致）
   * @query interval 默认 20，范围 1–200
   * @query limit 默认 100，最多 500
   */
  @Get('recent')
  async recent(@Query('limit') limitRaw?: string, @Query('interval') intervalRaw?: string) {
    const limit = Math.min(500, Math.max(1, parseInt(limitRaw ?? '100', 10) || 100));
    const interval = Math.min(200, Math.max(1, parseInt(intervalRaw ?? '20', 10) || 20));

    const rows = await this.prisma.$queryRaw<
      Array<{ height: number; block_id: string; digit: number; created_at: Date }>
    >(Prisma.sql`
      SELECT height, block_id, digit, created_at
      FROM block_hash_log
      WHERE digit IS NOT NULL
        AND MOD(height, ${interval}) = 0
      ORDER BY height DESC
      LIMIT ${limit}
    `);

    const items = rows.reverse().map((r) => ({
      height: r.height,
      blockId: r.block_id,
      digit: r.digit,
      createdAt: r.created_at,
    }));

    return { ok: true, interval, items };
  }
}
