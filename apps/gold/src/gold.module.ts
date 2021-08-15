import { HttpModule, Module } from '@nestjs/common';
import { GoldService } from './gold.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';
import {
  Gold,
  GoldsSchema,
  Realm,
  RealmsSchema
} from '@app/mongo';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Realm.name, schema: RealmsSchema },
      { name: Gold.name, schema: GoldsSchema },
    ]),
  ],
  controllers: [],
  providers: [GoldService],
})
export class GoldModule {}
