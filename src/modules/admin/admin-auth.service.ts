import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from '../auth/password.util';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  signAdminToken(adminId: number): string {
    return this.jwt.sign({ sub: String(adminId), typ: 'admin' });
  }

  async login(email: string, password: string) {
    const e = (email || '').trim().toLowerCase();
    if (!e || !password) throw new UnauthorizedException('邮箱或密码错误');
    const admin = await this.prisma.admin.findUnique({ where: { email: e } });
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    const token = this.signAdminToken(admin.id);
    return { ok: true, token, admin: { id: admin.id, email: admin.email } };
  }

  /** 仅当库中尚无管理员且 ADMIN_BOOTSTRAP_SECRET 正确时可用 */
  async bootstrap(email: string, password: string, secret: string) {
    const boot = process.env.ADMIN_BOOTSTRAP_SECRET?.trim();
    if (!boot || secret !== boot) {
      throw new UnauthorizedException('bootstrap secret 无效或未配置 ADMIN_BOOTSTRAP_SECRET');
    }
    const count = await this.prisma.admin.count();
    if (count > 0) {
      throw new BadRequestException('已有管理员，请使用管理员账号登录后新增');
    }
    const e = (email || '').trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      throw new BadRequestException('邮箱格式不正确');
    }
    if (!password || password.length < 8) {
      throw new BadRequestException('密码至少 8 位');
    }
    const passwordHash = hashPassword(password);
    const admin = await this.prisma.admin.create({
      data: { email: e, passwordHash },
    });
    const token = this.signAdminToken(admin.id);
    return { ok: true, token, admin: { id: admin.id, email: admin.email } };
  }
}
