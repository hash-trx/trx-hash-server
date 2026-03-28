import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  /** 与 package.json 同步，便于云端 curl 验证是否已部署新版本 */
  getVersion(): { name: string; version: string } {
    try {
      const pkgPath = join(process.cwd(), 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string; version?: string };
      return { name: pkg.name ?? 'nestjs-server', version: pkg.version ?? 'unknown' };
    } catch {
      return { name: 'nestjs-server', version: 'unknown' };
    }
  }
}
