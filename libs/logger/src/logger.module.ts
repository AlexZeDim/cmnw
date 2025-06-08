import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService, HttpModule],
})
export class LoggerModule {}
