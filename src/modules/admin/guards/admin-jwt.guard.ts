import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers?: { authorization?: string }; admin?: { id: number; email: string } }>();
    const raw = req.headers?.authorization;
    const token = raw?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('No token');

    let payload: { sub?: string; typ?: string };
    try {
      payload = this.jwt.verify(token) as { sub?: string; typ?: string };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    if (payload.typ !== 'admin' || !payload.sub) {
      throw new UnauthorizedException('Not an admin token');
    }
    const id = parseInt(payload.sub, 10);
    if (!id) throw new UnauthorizedException('Invalid token');
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new UnauthorizedException('Admin not found');
    req.admin = { id: admin.id, email: admin.email };
    return true;
  }
}
