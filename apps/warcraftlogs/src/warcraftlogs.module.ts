import { Module } from '@nestjs/common';
import { WarcraftlogsService } from './warcraftlogs.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig } from '@app/configuration';
import { Realm, RealmsSchema, WarcraftLogs, WarcraftLogsSchema } from '@app/mongo';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Realm.name, schema: RealmsSchema }]),
    MongooseModule.forFeature([{ name: WarcraftLogs.name, schema: WarcraftLogsSchema }]),
  ],
  controllers: [],
  providers: [WarcraftlogsService],
})
export class WarcraftlogsModule {}
