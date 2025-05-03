import { NestFactory } from '@nestjs/core';
import { ContractsModule } from './contracts.module';

async function bootstrap() {
  const app = await NestFactory.create(ContractsModule);
  await app.listen(3020);
}
bootstrap();
