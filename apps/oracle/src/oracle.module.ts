import { Module } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { Key, Message, KeysSchema, MessagesSchema } from '@app/mongo';
import { RedisModule } from '@nestjs-modules/ioredis';

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
      { name: Message.name, schema: MessagesSchema },
    ])
  ],
  controllers: [],
  providers: [OracleService],
})
export class OracleModule {}
