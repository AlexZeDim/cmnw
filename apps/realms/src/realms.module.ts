import { Module } from '@nestjs/common';
import { BullModule } from '@anchan828/nest-bullmq';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { RealmsService } from './realms.service';
import { RealmsWorker } from './realms.worker';
import { MongooseModule } from '@nestjs/mongoose';
import { realmsQueue } from '@app/core';
import {
  Character,
  CharactersSchema,
  Guild,
  GuildsSchema,
  Key,
  KeysSchema,
  Realm,
  RealmsSchema,
  RealmPopulation,
  RealmsPopulationSchema,
} from '@app/mongo';
import { ScheduleModule } from '@nestjs/schedule';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: RealmPopulation.name, schema: RealmsPopulationSchema },
      { name: Guild.name, schema: GuildsSchema },
      { name: Character.name, schema: CharactersSchema }
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue({ queueName: realmsQueue.name, options: realmsQueue.options }),
  ],
  controllers: [],
  providers: [RealmsService, RealmsWorker],
})
export class RealmsModule {}
