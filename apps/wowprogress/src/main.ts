import { NestFactory } from '@nestjs/core';
import { WowprogressModule } from './wowprogress.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(WowprogressModule);
  app.useLogger(new LoggerService(APP_LABELS.W));
  await app.listen(3000);
}
bootstrap();
