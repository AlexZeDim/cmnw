import { NestFactory } from '@nestjs/core';
import { OraculumModule } from './oraculum.module';

async function bootstrap() {
  const app = await NestFactory.create(OraculumModule);
  await app.listen(3000);
}
bootstrap();
