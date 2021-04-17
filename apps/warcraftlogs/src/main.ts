import { NestFactory } from '@nestjs/core';
import { WarcraftlogsModule } from './warcraftlogs.module';

async function bootstrap() {
  const app = await NestFactory.create(WarcraftlogsModule);
  await app.listen(3000);
}
bootstrap();
