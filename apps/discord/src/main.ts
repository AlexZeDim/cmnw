import { NestFactory } from '@nestjs/core';
import { DiscordModule } from './discord.module';

async function bootstrap() {
  const app = await NestFactory.create(DiscordModule);
  await app.listen(3000);
}
bootstrap();
