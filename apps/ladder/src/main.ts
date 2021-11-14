import { NestFactory } from '@nestjs/core';
import { LadderModule } from './ladder.module';

async function bootstrap() {
  const app = await NestFactory.create(LadderModule);
  await app.listen(3000);
}
bootstrap();
