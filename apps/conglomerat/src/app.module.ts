import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig } from '@app/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [MongooseModule.forRoot(mongoConfig.connection_string)],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
