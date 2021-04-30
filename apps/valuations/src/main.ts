import { NestFactory } from '@nestjs/core';
import { ValuationsModule } from './valuations.module';

async function bootstrap() {
  const app = await NestFactory.create(ValuationsModule);
  await app.listen(3000);
}
bootstrap();
