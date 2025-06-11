import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(CoreModule);
  app.useLogger(new LoggerService(APP_LABELS.C));
  await app.listen(3000);
}
bootstrap();
