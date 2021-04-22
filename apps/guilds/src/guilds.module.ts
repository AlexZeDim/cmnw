import { Module } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { Guild, GuildsSchema, Key, KeysSchema } from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { charactersQueue } from '@app/core';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { GuildsWorker } from './guilds.worker';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Key.name, schema: KeysSchema }]),
    MongooseModule.forFeature([{ name: Guild.name, schema: GuildsSchema }]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(charactersQueue.name),
    BullModule.registerQueue(guildsQueue.name),
  ],
  controllers: [],
  providers: [GuildsService, GuildsWorker],
})
export class GuildsModule {}
