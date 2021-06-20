import { NestFactory } from '@nestjs/core';
import { OracleModule } from './oracle.module';

async function bootstrap() {
  const app = await NestFactory.create(OracleModule);
  await app.listen(3000);
}
bootstrap();
