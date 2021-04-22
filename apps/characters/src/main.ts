import { NestFactory } from '@nestjs/core';
import { CharactersModule } from './characters.module';

async function bootstrap() {
  const app = await NestFactory.create(CharactersModule);
  await app.listen(3000);
}
bootstrap();
