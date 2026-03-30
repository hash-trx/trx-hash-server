import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../auth/password.util';

function normalizeParamsSchema(input: unknown): Prisma.InputJsonValue {
  if (input === undefined || input === null) return [];
  if (Array.isArray(input)) return input as Prisma.InputJsonValue;
  if (typeof input === 'string') {
    const t = input.trim();
    if (!t) return [];
    try {
      const p = JSON.parse(t);
      if (!Array.isArray(p)) throw new BadRequestException('paramsSchema 须为 JSON 数组');
      return p as Prisma.InputJsonValue;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('paramsSchema 不是合法 JSON');
    }
  }
  throw new BadRequestException('paramsSchema 须为 JSON 数组');
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- 用户 ----------
  async listUsers(pageRaw?: number, pageSizeRaw?: number, q?: string) {
    const page = Math.max(1, Math.floor(Number(pageRaw) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSizeRaw) || 20)));
    const skip = (page - 1) * pageSize;
    const emailQ = (q || '').trim();
    const where = emailQ
      ? { email: { contains: emailQ, mode: 'insensitive' as const } }
      : {};
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
    ]);
    return {
      ok: true,
      total,
      page,
      pageSize,
      items: rows.map((u) => ({
        id: u.id,
        email: u.email,
        subExpire: u.subExpire?.toISOString() ?? null,
        pnlTotal: u.pnlTotal,
        betCountTotal: u.betCountTotal,
        betAmountTotal: u.betAmountTotal,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  }

  async getUser(id: number) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('用户不存在');
    return {
      ok: true,
      user: {
        id: u.id,
        email: u.email,
        subExpire: u.subExpire?.toISOString() ?? null,
        pnlTotal: u.pnlTotal,
        betCountTotal: u.betCountTotal,
        betAmountTotal: u.betAmountTotal,
        createdAt: u.createdAt.toISOString(),
      },
    };
  }

  async updateUser(
    id: number,
    body: {
      email?: string;
      subExpire?: string | null;
      pnlTotal?: number;
      betCountTotal?: number;
      betAmountTotal?: number;
    },
  ) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('用户不存在');

    const data: Record<string, unknown> = {};
    if (body.email !== undefined) {
      const e = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new BadRequestException('邮箱格式不正确');
      const clash = await this.prisma.user.findFirst({ where: { email: e, NOT: { id } } });
      if (clash) throw new BadRequestException('该邮箱已被使用');
      data.email = e;
    }
    if (body.subExpire !== undefined) {
      data.subExpire = body.subExpire === null || body.subExpire === '' ? null : new Date(body.subExpire);
    }
    if (body.pnlTotal !== undefined) data.pnlTotal = Number(body.pnlTotal);
    if (body.betCountTotal !== undefined) data.betCountTotal = Math.floor(Number(body.betCountTotal));
    if (body.betAmountTotal !== undefined) data.betAmountTotal = Number(body.betAmountTotal);

    const updated = await this.prisma.user.update({ where: { id }, data: data as any });
    return { ok: true, user: { id: updated.id, email: updated.email } };
  }

  async resetUserPassword(id: number, newPassword: string) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    if (!newPassword || newPassword.length < 8) throw new BadRequestException('密码至少 8 位');
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('用户不存在');
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashPassword(newPassword) },
    });
    return { ok: true };
  }

  // ---------- 策略（StrategyMarket）----------
  async listStrategies() {
    const rows = await this.prisma.strategyMarket.findMany({
      orderBy: [{ isHot: 'desc' }, { id: 'asc' }],
    });
    return { ok: true, items: rows };
  }

  async createStrategy(body: {
    id: number;
    name: string;
    price: number;
    scriptUrl?: string;
    scriptCode: string;
    paramsSchema?: unknown;
    isHot?: boolean;
  }) {
    const id = Math.floor(Number(body.id));
    if (!id) throw new BadRequestException('id 必填且为正整数');
    if (!body.name?.trim()) throw new BadRequestException('name 必填');
    const scriptCode = (body.scriptCode ?? '').trim();
    if (!scriptCode) throw new BadRequestException('scriptCode 必填（策略 JS 正文）');
    const exists = await this.prisma.strategyMarket.findUnique({ where: { id } });
    if (exists) throw new BadRequestException('该策略 id 已存在');
    const row = await this.prisma.strategyMarket.create({
      data: {
        id,
        name: body.name.trim(),
        price: Number(body.price) || 0,
        scriptUrl: (body.scriptUrl || '').trim() || '/strategies/' + id + '/script',
        scriptCode,
        paramsSchema: normalizeParamsSchema(body.paramsSchema !== undefined ? body.paramsSchema : []),
        isHot: !!body.isHot,
      },
    });
    return { ok: true, strategy: row };
  }

  async updateStrategy(
    id: number,
    body: {
      name?: string;
      price?: number;
      scriptUrl?: string;
      scriptCode?: string | null;
      paramsSchema?: unknown;
      isHot?: boolean;
    },
  ) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    const row = await this.prisma.strategyMarket.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('策略不存在');
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.scriptUrl !== undefined) data.scriptUrl = body.scriptUrl.trim();
    if (body.scriptCode !== undefined) data.scriptCode = body.scriptCode === null || body.scriptCode === '' ? null : String(body.scriptCode).trim() || null;
    if (body.paramsSchema !== undefined) data.paramsSchema = normalizeParamsSchema(body.paramsSchema);
    if (body.isHot !== undefined) data.isHot = !!body.isHot;
    const updated = await this.prisma.strategyMarket.update({ where: { id }, data: data as any });
    return { ok: true, strategy: updated };
  }

  async deleteStrategy(id: number) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    const row = await this.prisma.strategyMarket.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('策略不存在');
    await this.prisma.strategyPurchase.deleteMany({ where: { strategyId: id } });
    await this.prisma.strategyUsage.deleteMany({ where: { strategyId: id } });
    await this.prisma.strategyMarket.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- 市场庄家 ----------
  async listBankers() {
    const rows = await this.prisma.marketBanker.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { ok: true, items: rows };
  }

  async createBanker(body: {
    name: string;
    address: string;
    odds: number;
    rebate?: number;
    sortOrder?: number;
    note?: string;
    description?: string;
  }) {
    if (!body.name?.trim()) throw new BadRequestException('name 必填');
    if (!body.address?.trim()) throw new BadRequestException('address 必填');
    const row = await this.prisma.marketBanker.create({
      data: {
        name: body.name.trim(),
        address: body.address.trim(),
        odds: Number(body.odds) || 0,
        rebate: body.rebate !== undefined ? Number(body.rebate) : 0,
        sortOrder: body.sortOrder !== undefined ? Math.floor(Number(body.sortOrder)) : 0,
        note: body.note?.trim() || null,
        description: body.description?.trim() || null,
      },
    });
    return { ok: true, banker: row };
  }

  async updateBanker(
    id: number,
    body: {
      name?: string;
      address?: string;
      odds?: number;
      rebate?: number;
      sortOrder?: number;
      note?: string | null;
      description?: string | null;
    },
  ) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    const row = await this.prisma.marketBanker.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('记录不存在');
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.address !== undefined) data.address = body.address.trim();
    if (body.odds !== undefined) data.odds = Number(body.odds);
    if (body.rebate !== undefined) data.rebate = Number(body.rebate);
    if (body.sortOrder !== undefined) data.sortOrder = Math.floor(Number(body.sortOrder));
    if (body.note !== undefined) data.note = body.note;
    if (body.description !== undefined) data.description = body.description;
    const updated = await this.prisma.marketBanker.update({ where: { id }, data: data as any });
    return { ok: true, banker: updated };
  }

  async deleteBanker(id: number) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    const row = await this.prisma.marketBanker.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('记录不存在');
    await this.prisma.marketBanker.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- 管理员账号 ----------
  async listAdmins() {
    const rows = await this.prisma.admin.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    return {
      ok: true,
      items: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  async createAdmin(body: { email: string; password: string }) {
    const e = (body.email || '').trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new BadRequestException('邮箱格式不正确');
    if (!body.password || body.password.length < 8) throw new BadRequestException('密码至少 8 位');
    const exists = await this.prisma.admin.findUnique({ where: { email: e } });
    if (exists) throw new BadRequestException('该邮箱已存在');
    const admin = await this.prisma.admin.create({
      data: { email: e, passwordHash: hashPassword(body.password) },
    });
    return { ok: true, admin: { id: admin.id, email: admin.email } };
  }

  async updateAdmin(id: number, body: { email?: string; password?: string }) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    const row = await this.prisma.admin.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('管理员不存在');
    const data: { email?: string; passwordHash?: string } = {};
    if (body.email !== undefined) {
      const e = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new BadRequestException('邮箱格式不正确');
      const clash = await this.prisma.admin.findFirst({ where: { email: e, NOT: { id } } });
      if (clash) throw new BadRequestException('该邮箱已被使用');
      data.email = e;
    }
    if (body.password !== undefined) {
      if (!body.password || body.password.length < 8) throw new BadRequestException('密码至少 8 位');
      data.passwordHash = hashPassword(body.password);
    }
    if (Object.keys(data).length === 0) throw new BadRequestException('无更新字段');
    await this.prisma.admin.update({ where: { id }, data });
    return { ok: true };
  }

  async deleteAdmin(id: number, currentAdminId: number) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    if (id === currentAdminId) throw new BadRequestException('不能删除当前登录账号');
    const cnt = await this.prisma.admin.count();
    if (cnt <= 1) throw new BadRequestException('至少保留一名管理员');
    const row = await this.prisma.admin.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('管理员不存在');
    await this.prisma.admin.delete({ where: { id } });
    return { ok: true };
  }
}
