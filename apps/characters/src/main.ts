import { NestFactory } from '@nestjs/core';
import { CharactersModule } from './characters.module';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(CharactersModule);
  app.useLogger(new LoggerService(APP_LABELS.CH));
  await app.listen(3001);
}
bootstrap();
