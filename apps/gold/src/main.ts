import { NestFactory } from '@nestjs/core';
import { GoldModule } from './gold.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(GoldModule);
  app.useLogger(new LoggerService(APP_LABELS.GOLD));
  await app.listen(3000);
}
bootstrap();
