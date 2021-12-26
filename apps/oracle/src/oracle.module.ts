import { Module } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { RedisModule } from '@nestjs-modules/ioredis';
import { BullModule } from '@anchan828/nest-bullmq';
import { deliveryQueue, messagesQueue } from '@app/core';
import {
  Key,
  Message,
  KeysSchema,
  MessagesSchema,
  Account,
  AccountsSchema,
  Entity,
  EntitySchema
} from '@app/mongo';


@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
    }),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Account.name, schema: AccountsSchema },
      { name: Message.name, schema: MessagesSchema },
      { name: Entity.name, schema: EntitySchema },
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue({ queueName: messagesQueue.name, options: messagesQueue.options }),
    BullModule.registerQueue({ queueName: deliveryQueue.name, options: deliveryQueue.options }),
  ],
  controllers: [],
  providers: [OracleService],
})
export class OracleModule {}
