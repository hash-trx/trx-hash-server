/**
 * Auth - POST /auth/register, POST /auth/login（密码）
 */

import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body('email') email: string, @Body('password') password: string) {
    const r = await this.auth.register(email || '', password || '');
    if (!r.ok) return r;
    return { ok: true };
  }

  @Post('verify-password')
  async verifyPassword(
    @Headers('authorization') authHeader: string,
    @Body('password') password: string,
  ) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return { ok: false, error: 'No token' };
    const ok = await this.auth.verifyLoginPassword(token, password || '');
    if (!ok) return { ok: false, error: '登录密码错误' };
    return { ok: true };
  }

  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string) {
    const result = await this.auth.login(email || '', password || '');
    if (!result) {
      return { ok: false, error: '邮箱或密码错误，或尚未注册' };
    }
    return { ok: true, ...result };
  }

  @Get('status')
  async status(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return { ok: false, error: 'No token' };
    }
    const status = await this.auth.getStatus(token);
    if (!status) {
      return { ok: false, error: 'Invalid token' };
    }
    return { ok: true, ...status };
  }

  @Get('subscription-info')
  async subscriptionInfo(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return { ok: false, error: 'No token' };
    }
    const info = await this.auth.getSubscriptionInfo(token);
    if (!info) {
      return { ok: false, error: 'Not configured' };
    }
    return { ok: true, info };
  }

  /** 方案 A：用户提交 txid，后端立刻核验并激活 */
  @Post('activate-by-txid')
  async activateByTxid(
    @Headers('authorization') authHeader: string,
    @Body('txid') txid: string,
  ) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return { ok: false, error: 'No token' };
    const r = await this.auth.activateByTxid(token, txid || '');
    return r;
  }
}
