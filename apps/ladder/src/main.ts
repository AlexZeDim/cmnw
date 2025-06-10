import { NestFactory } from '@nestjs/core';
import { LadderModule } from './ladder.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(LadderModule);
  app.useLogger(new LoggerService(APP_LABELS.L));
  await app.listen(3000);
}
bootstrap();
