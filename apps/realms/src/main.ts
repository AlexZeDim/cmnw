import { NestFactory } from '@nestjs/core';
import { RealmsModule } from './realms.module';

async function bootstrap() {
  const app = await NestFactory.create(RealmsModule);
  await app.listen(3000);
}
bootstrap();
