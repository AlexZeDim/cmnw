import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { OraculumService } from './oraculum.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import {
  Account,
  AccountsSchema,
  Character,
  CharactersSchema,
  Entity,
  EntitySchema,
  Guild,
  GuildsSchema,
  Key,
  KeysSchema,
  Realm,
  RealmsSchema,
} from '@app/mongo';

console.log(mongoConfig.connection_string);

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
      { name: Account.name, schema: AccountsSchema },
      { name: Character.name, schema: CharactersSchema },
      { name: Guild.name, schema: GuildsSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Entity.name, schema: EntitySchema },
      { name: Key.name, schema: KeysSchema },
    ]),
  ],
  controllers: [],
  providers: [OraculumService],
})
export class OraculumModule {}
