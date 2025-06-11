import { NestFactory } from '@nestjs/core';
import { ContractsModule } from './contracts.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(ContractsModule);
  app.useLogger(new LoggerService(APP_LABELS.C));
  await app.listen(3020);
}
bootstrap();
