import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

const FEEDBACK_STATUSES = ['new', 'read', 'done'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  getTelegramInviteUrl(): string {
    const u = (process.env.TELEGRAM_INVITE_URL || '').trim();
    if (u && /^https?:\/\//i.test(u)) return u;
    return 'https://t.me/';
  }

  async createFeedback(
    authHeader: string | undefined,
    body: {
      subject?: string;
      content?: string;
      contact?: string;
      clientVersion?: string;
    },
  ): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
    const content = (body.content || '').trim();
    if (content.length < 5) return { ok: false, error: '反馈内容至少 5 个字' };
    if (content.length > 8000) return { ok: false, error: '反馈内容过长' };

    const subject = body.subject != null ? String(body.subject).trim().slice(0, 200) : '';
    const contact = body.contact != null ? String(body.contact).trim().slice(0, 200) : '';

    let userId: number | null = null;
    let userEmail: string | null = null;
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const v = this.auth.validateJwt(token);
      if (v) {
        const uid = parseInt(v.userId, 10);
        if (Number.isFinite(uid) && uid > 0) {
          const u = await this.prisma.user.findUnique({ where: { id: uid } });
          if (u) {
            userId = u.id;
            userEmail = u.email;
          }
        }
      }
    }

    const clientVersion =
      body.clientVersion != null ? String(body.clientVersion).trim().slice(0, 64) : null;

    const row = await this.prisma.feedback.create({
      data: {
        userId,
        userEmail,
        subject: subject || null,
        content,
        contact: contact || null,
        clientVersion,
      },
    });

    return { ok: true, id: row.id };
  }

  async listFeedback(pageRaw?: number, pageSizeRaw?: number, statusQ?: string) {
    const page = Math.max(1, Math.floor(Number(pageRaw) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSizeRaw) || 20)));
    const skip = (page - 1) * pageSize;
    const st = (statusQ || '').trim();
    const where =
      st && FEEDBACK_STATUSES.includes(st as FeedbackStatus) ? { status: st } : {};

    const [total, rows] = await Promise.all([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
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
      items: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userEmail: r.userEmail,
        subject: r.subject,
        contentPreview: r.content.length > 120 ? r.content.slice(0, 120) + '…' : r.content,
        contact: r.contact,
        clientVersion: r.clientVersion,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async getFeedback(id: number) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    const r = await this.prisma.feedback.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('记录不存在');
    return {
      ok: true,
      item: {
        id: r.id,
        userId: r.userId,
        userEmail: r.userEmail,
        subject: r.subject,
        content: r.content,
        contact: r.contact,
        clientVersion: r.clientVersion,
        status: r.status,
        adminNote: r.adminNote,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      },
    };
  }

  async updateFeedback(
    id: number,
    body: { status?: string; adminNote?: string | null },
  ) {
    if (!Number.isFinite(id)) throw new BadRequestException('无效 id');
    const r = await this.prisma.feedback.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('记录不存在');

    const data: { status?: string; adminNote?: string | null } = {};
    if (body.status !== undefined) {
      const st = String(body.status).trim();
      if (!FEEDBACK_STATUSES.includes(st as FeedbackStatus)) {
        throw new BadRequestException('无效状态');
      }
      data.status = st;
    }
    if (body.adminNote !== undefined) {
      const n = body.adminNote === null ? null : String(body.adminNote).trim().slice(0, 4000);
      data.adminNote = n;
    }

    await this.prisma.feedback.update({ where: { id }, data });
    return { ok: true };
  }
}
