import { NestFactory } from '@nestjs/core';
import { KeysModule } from './keys.module';

async function bootstrap() {
  const app = await NestFactory.create(KeysModule);
  await app.listen(3001);
}
bootstrap();
