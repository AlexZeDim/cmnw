import { NestFactory } from '@nestjs/core';
import { AuctionsModule } from './auctions.module';

async function bootstrap() {
  const app = await NestFactory.create(AuctionsModule);
  await app.listen(3002);
}
bootstrap();
