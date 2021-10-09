import { NestFactory } from '@nestjs/core';
import { GatekeeperModule } from './gatekeeper.module';

async function bootstrap() {
  const app = await NestFactory.create(GatekeeperModule);
  await app.listen(3000);
}
bootstrap();
