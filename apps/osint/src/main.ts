import { NestFactory } from '@nestjs/core';
import { OsintModule } from './osint.module';

async function bootstrap() {
  const app = await NestFactory.create(OsintModule);
  await app.listen(3000);
}
bootstrap();
