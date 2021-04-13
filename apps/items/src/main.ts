import { NestFactory } from '@nestjs/core';
import { ItemsModule } from './items.module';

async function bootstrap() {
  const app = await NestFactory.create(ItemsModule);
  await app.listen(3000);
}
bootstrap();
