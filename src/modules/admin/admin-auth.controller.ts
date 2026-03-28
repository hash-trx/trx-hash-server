import { Body, Controller, Post } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    return this.adminAuth.login(body.email ?? '', body.password ?? '');
  }

  /** 首次创建管理员：需环境变量 ADMIN_BOOTSTRAP_SECRET，且库中尚无管理员 */
  @Post('bootstrap')
  async bootstrap(@Body() body: { email?: string; password?: string; secret?: string }) {
    return this.adminAuth.bootstrap(body.email ?? '', body.password ?? '', body.secret ?? '');
  }
}
