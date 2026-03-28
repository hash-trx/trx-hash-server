import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';

/**
 * 管理后台单页（public/admin/index.html）
 * GET /admin、/admin/login、/admin/app 均返回同一页面，由前端路由/状态切换。
 */
@Controller('admin')
export class AdminUiController {
  private readonly htmlPath = join(process.cwd(), 'public', 'admin', 'index.html');

  @Get(['', 'login', 'app'])
  serve(@Res() res: Response) {
    res.sendFile(this.htmlPath);
  }
}
