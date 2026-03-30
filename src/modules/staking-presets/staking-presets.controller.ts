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
          { key: 'baseAmount', label: '平注(TRX)', type: 'number', default: 10, min: 1, step: 1 },
          { key: 'maxBet', label: '最大(TRX)', type: 'number', default: 128, min: 1, step: 1 },
        ],
        enabled: true,
        sortOrder: 10,
      },
      {
        kind: 'martingale_reset',
        name: '倍投（胜复位）',
        paramsSchema: [
          { key: 'baseAmount', label: '首注(TRX)', type: 'number', default: 10, min: 1, step: 1 },
          { key: 'multiplier', label: '倍数', type: 'number', default: 2, min: 1, step: 0.5 },
          { key: 'maxBet', label: '最大(TRX)', type: 'number', default: 128, min: 1, step: 1 },
          { key: 'maxIndex', label: '最大档位', type: 'number', default: 10, min: 1, step: 1 },
        ],
        enabled: true,
        sortOrder: 20,
      },
      {
        kind: 'fibonacci_back2',
        name: '斐波那契（胜回退2格）',
        paramsSchema: [
          { key: 'baseAmount', label: '基数(TRX)', type: 'number', default: 10, min: 1, step: 1 },
          { key: 'backSteps', label: '胜回退格数', type: 'number', default: 2, min: 1, step: 1 },
          { key: 'maxBet', label: '最大(TRX)', type: 'number', default: 128, min: 1, step: 1 },
          { key: 'maxIndex', label: '最大档位', type: 'number', default: 10, min: 1, step: 1 },
        ],
        enabled: true,
        sortOrder: 30,
      },
      {
        kind: 'win_streak_reset',
        name: '连赢复位（连赢K次回第一档）',
        paramsSchema: [
          { key: 'baseAmount', label: '首注(TRX)', type: 'number', default: 10, min: 1, step: 1 },
          { key: 'multiplier', label: '倍数', type: 'number', default: 2, min: 1, step: 0.5 },
          { key: 'resetAfterWins', label: '连赢K次回复', type: 'number', default: 2, min: 1, step: 1 },
          { key: 'maxBet', label: '最大(TRX)', type: 'number', default: 128, min: 1, step: 1 },
          { key: 'maxIndex', label: '最大档位', type: 'number', default: 10, min: 1, step: 1 },
        ],
        enabled: true,
        sortOrder: 40,
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

