import { NestFactory } from '@nestjs/core';
import { DmaModule } from './dma.module';

async function bootstrap() {
  const app = await NestFactory.create(DmaModule);
  await app.listen(3004);
}
bootstrap();
