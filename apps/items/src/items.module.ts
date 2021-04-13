import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { queueItems } from '@app/core';
import { Item, ItemsSchema, Key, KeysSchema } from '@app/mongo';
import { ItemsWorker } from './items.worker';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Key.name, schema: KeysSchema }]),
    MongooseModule.forFeature([{ name: Item.name, schema: ItemsSchema }]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(queueItems.name),
  ],
  controllers: [],
  providers: [ItemsService, ItemsWorker],
})
export class ItemsModule {}
