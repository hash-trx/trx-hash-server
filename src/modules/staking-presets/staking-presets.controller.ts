import { Controller, Get, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const AUTO_MATCH_FIELD = {
  key: 'autoMatch',
  label: '是否自动匹配',
  type: 'select',
  default: 'yes',
  options: [
    { label: '是（引擎自动按单双/大小匹配金额）', value: 'yes' },
    { label: '否（按策略脚本填写的金额）', value: 'no' },
  ],
}

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
        name: '平推（每笔交易的金额始终保持一致）',
        paramsSchema: [AUTO_MATCH_FIELD, { key: 'ladder', label: '投注金额(TRX)', type: 'text', default: '10', help: '填写一个金额即可。' }],
        enabled: true,
        sortOrder: 10,
      },
      {
        kind: 'martingale_reset',
        name: '胜复位（亏损时按倍数放大下注金额，盈利后立即回到初始金额）',
        paramsSchema: [
          AUTO_MATCH_FIELD,
          { key: 'ladder', label: '注码序列（逗号/换行）', type: 'text', default: '10,20,40,80', help: '金额用逗号或换行分隔。' },
        ],
        enabled: true,
        sortOrder: 20,
      },
      {
        kind: 'fibonacci_back2',
        name: '斐波那契（亏损递增一个档位下注，盈利则回退 2 个档位）',
        paramsSchema: [
          AUTO_MATCH_FIELD,
          { key: 'ladder', label: '注码序列（逗号/换行）', type: 'text', default: '10,10,20,30,50,80', help: '金额用逗号或换行分隔。' },
        ],
        enabled: true,
        sortOrder: 30,
      },
      {
        kind: 'win_streak_reset',
        name: '连赢复位（连续盈利达到设定次数后，自动回到初始下注档位）',
        paramsSchema: [
          AUTO_MATCH_FIELD,
          { key: 'ladder', label: '注码序列（逗号/换行）', type: 'text', default: '10,20,30,40', help: '金额用逗号或换行分隔。' },
        ],
        enabled: true,
        sortOrder: 40,
      },
      {
        kind: 'round3_ruleset1',
        name: '超级缆（首档与升档后规则不同，每轮 3 笔结算）',
        paramsSchema: [
          AUTO_MATCH_FIELD,
          {
            key: 'ladder',
            label: '注码序列（逗号/换行）',
            type: 'text',
            default: '10,20,30,50',
            help:
              '首档(index=0)：3赢降2、2赢降1、1赢不变、0赢升2。非首档：首笔赢则降1；首笔输则三笔齐后——0赢升2、2赢降1、1赢(两输)升1。',
          },
        ],
        enabled: true,
        sortOrder: 50,
      },
      {
        kind: 'bias_boost10_net3',
        name: '偏差加注（净赢未达阈值时，按次数阶梯加注比例）',
        paramsSchema: [
          AUTO_MATCH_FIELD,
          { key: 'ladder', label: '投注金额(TRX)', type: 'text', default: '10', help: '填写一个金额即可。' },
          { key: 'boostPct', label: '加注比例', type: 'number', default: 0.1, min: 0, max: 1, step: 0.01 },
          {
            key: 'boostEverySettles',
            label: '每结算几次加注一次',
            type: 'number',
            default: 3,
            min: 1,
            max: 100,
            step: 1,
            help: '净赢未达多赢阈值时，累计满此次数才可能加注。「多少把未连赢」为 0 时不限。填 1 表示每笔结算后都可能加注。',
          },
          {
            key: 'winStreakNeed',
            label: '连续赢几把算连赢',
            type: 'number',
            default: 2,
            min: 2,
            max: 20,
            step: 1,
            help: '连续赢达到此次数视为「连赢」，并重置「未连赢」计数。',
          },
          {
            key: 'boostMinWithoutWinStreak',
            label: '多少把未连赢才加注',
            type: 'number',
            default: 0,
            min: 0,
            max: 200,
            step: 1,
            help: '自上次连赢起累计多少笔结算都未再连赢才允许加注；0 表示不限制。',
          },
          { key: 'multiWinNet', label: '多赢阈值（净赢）', type: 'number', default: 3, min: 1, max: 20, step: 1 },
          { key: 'maxBet', label: '单笔上限(TRX)', type: 'number', default: 0, min: 0, max: 100000, step: 1 },
        ],
        enabled: true,
        sortOrder: 60,
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

