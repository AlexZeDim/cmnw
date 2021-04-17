import { NestFactory } from '@nestjs/core';
import { GuildsModule } from './guilds.module';

async function bootstrap() {
  const app = await NestFactory.create(GuildsModule);
  await app.listen(3000);
}
bootstrap();
