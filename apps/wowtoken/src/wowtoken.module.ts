import { Module } from '@nestjs/common';
import { WowtokenService } from './wowtoken.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig } from '@app/configuration';
import { Token, TokenSchema } from '@app/mongo';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }])
  ],
  controllers: [],
  providers: [WowtokenService],
})
export class WowtokenModule {}
