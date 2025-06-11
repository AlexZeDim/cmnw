import { NestFactory } from '@nestjs/core';
import { OsintModule } from './osint.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(OsintModule);
  app.useLogger(new LoggerService(APP_LABELS.O));
  await app.listen(3000);
}
bootstrap();
