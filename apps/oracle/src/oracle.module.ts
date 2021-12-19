import { Module } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { Key, Message, KeysSchema, MessagesSchema, Account, AccountsSchema, Entity, EntitySchema } from '@app/mongo';
import { RedisModule } from '@nestjs-modules/ioredis';
import { OracleWorker } from './oracle.worker';
import { BullModule } from '@anchan828/nest-bullmq';
import { messagesQueue } from '@app/core';

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
    BullModule.registerQueue({ queueName: messagesQueue.name, options: messagesQueue.options }),
  ],
  controllers: [],
  providers: [OracleService, OracleWorker],
})
export class OracleModule {}
