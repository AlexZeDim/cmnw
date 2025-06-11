import { NestFactory } from '@nestjs/core';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';
import { KeysModule } from './keys.module';

async function bootstrap() {
  const app = await NestFactory.create(KeysModule);
  app.useLogger(new LoggerService(APP_LABELS.K));
  await app.listen(3001);
}
bootstrap();
