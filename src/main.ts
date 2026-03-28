import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  const port = Number(process.env.PORT) || 3000;
  // Docker / 云主机需监听所有网卡，否则宿主机端口映射后外网无法访问
  await app.listen(port, '0.0.0.0');
}
bootstrap();
