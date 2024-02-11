import { NestFactory } from '@nestjs/core';
import { WarcraftlogsModule } from './warcraft-logs.module';

async function bootstrap() {
  const app = await NestFactory.create(WarcraftlogsModule);
  await app.listen(3000);
}
bootstrap();
