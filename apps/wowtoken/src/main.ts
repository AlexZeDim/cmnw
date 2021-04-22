import { NestFactory } from '@nestjs/core';
import { WowtokenModule } from './wowtoken.module';

async function bootstrap() {
  const app = await NestFactory.create(WowtokenModule);
  await app.listen(3000);
}
bootstrap();
