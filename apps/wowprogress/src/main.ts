import { NestFactory } from '@nestjs/core';
import { WowprogressModule } from './wowprogress.module';

async function bootstrap() {
  const app = await NestFactory.create(WowprogressModule);
  await app.listen(3000);
}
bootstrap();
