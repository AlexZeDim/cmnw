import { NestFactory } from '@nestjs/core';
import { BenchModule } from './bench.module';

async function bootstrap() {
  const app = await NestFactory.create(BenchModule);
  await app.listen(3000);
}
bootstrap();
