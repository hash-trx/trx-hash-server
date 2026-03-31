import { Controller, Get, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('staking-presets')
export class StakingPresetsController implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const defaults: Array<{
      kind: string;
      name: string;
      paramsSchema: any[];
      enabled: boolean;
      sortOrder: number;
    }> = [
      {
        kind: 'flat',
        name: '平推（同额）',
        paramsSchema: [
          { key: 'ladder', label: '投注金额(TRX)', type: 'text', default: '10', help: '平推：只需一个金额，每局用同额下注。' },
        ],
        enabled: true,
        sortOrder: 10,
      },
      {
        kind: 'martingale_reset',
        name: '倍投（胜复位）',
        paramsSchema: [
          { key: 'ladder', label: '注码序列（逗号/换行）', type: 'text', default: '10,20,40,80', help: '不中 → 序列下一格；中 → 回到第一格（胜复位）' },
        ],
        enabled: true,
        sortOrder: 20,
      },
      {
        kind: 'fibonacci_back2',
        name: '斐波那契（胜回退2格）',
        paramsSchema: [
          { key: 'ladder', label: '注码序列（逗号/换行）', type: 'text', default: '10,10,20,30,50,80', help: '不中 → 序列下一格；中 → 回退 2 格（最低回到第一格）' },
        ],
        enabled: true,
        sortOrder: 30,
      },
      {
        kind: 'win_streak_reset',
        name: '连赢复位（连赢K次回第一档）',
        paramsSchema: [
          { key: 'ladder', label: '注码序列（逗号/换行）', type: 'text', default: '10,20,30,40', help: '不中 → 序列下一格；连赢 2 次 → 回到第一格（默认 K=2，后续如需可上云可配）' },
        ],
        enabled: true,
        sortOrder: 40,
      },
      {
        kind: 'round3_ruleset1',
        name: '三把内结算（进2/退1/留档）',
        paramsSchema: [
          { key: 'ladder', label: '注码序列（逗号/换行）', type: 'text', default: '10,20,30,50', help: '每轮最多3把：不在首档且第1把赢→退1；否则按该轮3把胜负决定进2/进1/退1/不动（规则已内置）' },
        ],
        enabled: true,
        sortOrder: 50,
      },
    ]

    for (const d of defaults) {
      const exists = await this.prisma.stakingPreset.findFirst({ where: { kind: d.kind } })
      if (!exists) {
        await this.prisma.stakingPreset.create({
          data: {
            kind: d.kind,
            name: d.name,
            paramsSchema: d.paramsSchema,
            enabled: d.enabled,
            sortOrder: d.sortOrder,
          },
        })
      }
    }
  }

  @Get()
  async listEnabled() {
    const rows = await this.prisma.stakingPreset.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return {
      ok: true,
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        name: r.name,
        paramsSchema: Array.isArray(r.paramsSchema as any) ? (r.paramsSchema as any) : [],
      })),
    };
  }
}

