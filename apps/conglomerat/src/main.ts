import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cmnwConfig } from '@app/configuration';
import { useContainer } from 'class-validator';
import { LoggerService } from '@app/logger';
import { APP_LABELS } from '@app/resources';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useLogger(new LoggerService(APP_LABELS.CMNW));

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());

  const options = new DocumentBuilder()
    .setTitle('CMNW Backend')
    .setDescription('Provides REST API for CMNW-DB')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(cmnwConfig.port);
}
bootstrap();
