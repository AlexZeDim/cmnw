import { NestFactory } from '@nestjs/core';
import { AuctionsModule } from './auctions.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(AuctionsModule);
  app.useLogger(new LoggerService(APP_LABELS.A));
  await app.listen(3002);
}
bootstrap();
