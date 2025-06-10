import { NestFactory } from '@nestjs/core';
import { RealmsModule } from './realms.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(RealmsModule);
  app.useLogger(new LoggerService(APP_LABELS.R));
  await app.listen(3003);
}
bootstrap();
