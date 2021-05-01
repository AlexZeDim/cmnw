import { NestFactory } from '@nestjs/core';
import { GoldModule } from './gold.module';

async function bootstrap() {
  const app = await NestFactory.create(GoldModule);
  await app.listen(3000);
}
bootstrap();
