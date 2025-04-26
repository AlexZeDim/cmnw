import { NestFactory } from '@nestjs/core';
import { TestsModule } from './tests.module';

async function bootstrap() {
  const app = await NestFactory.create(TestsModule);
  await app.listen(3010);
}
bootstrap();
