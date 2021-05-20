import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig } from '@app/configuration';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
  ],
  controllers: [],
  providers: [],
})
export class AuthModule {}
