import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller()
export class PublicAssetsController {
  @Get('telegram.png')
  telegramPng(@Res() res: Response) {
    // 不同部署方式下 cwd 可能不是项目根目录，这里做多路径兜底，避免 404
    const candidates = [
      join(process.cwd(), 'public', 'telegram.png'),
      join(process.cwd(), 'telegram.png'),
      join(process.cwd(), 'apps', 'nestjs-server', 'public', 'telegram.png'),
      '/opt/nestjs-server/public/telegram.png',
    ];
    const hit = candidates.find((p) => existsSync(p));
    if (!hit) return res.status(404).send('Not found');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(hit);
  }
}

