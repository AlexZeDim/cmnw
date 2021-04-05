import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig } from '@app/configuration';

@Module({
  imports: [MongooseModule.forRoot(mongoConfig.connection_string)],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
