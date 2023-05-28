import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { itemsQueue } from '@app/core';
import { Item, ItemsSchema, Key, KeysSchema } from '@app/mongo';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Item.name, schema: ItemsSchema },
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
        },
      },
    }),
    BullModule.registerQueue({ queueName: itemsQueue.name, options: itemsQueue.options }),
  ],
  controllers: [],
  providers: [ItemsService],
})
export class ItemsModule {}
