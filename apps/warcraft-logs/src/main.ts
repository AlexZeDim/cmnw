import { NestFactory } from '@nestjs/core';
import { WarcraftLogsModule } from './warcraft-logs.module';

async function bootstrap() {
  const app = await NestFactory.create(WarcraftLogsModule);
  await app.listen(3000);
}
bootstrap();
