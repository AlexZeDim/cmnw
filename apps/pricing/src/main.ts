import { NestFactory } from '@nestjs/core';
import { PricingModule } from './pricing.module';

async function bootstrap() {
  const app = await NestFactory.create(PricingModule);
  await app.listen(3000);
}
bootstrap();
