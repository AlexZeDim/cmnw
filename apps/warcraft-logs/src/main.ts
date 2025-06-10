import { NestFactory } from '@nestjs/core';
import { WarcraftLogsModule } from './warcraft-logs.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(WarcraftLogsModule);
  app.useLogger(new LoggerService(APP_LABELS.WCL));
  await app.listen(3000);
}
bootstrap();
