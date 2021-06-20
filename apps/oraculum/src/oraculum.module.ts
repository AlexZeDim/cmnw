import { Module } from '@nestjs/common';
import { OraculumBuilder } from './oraculum.builder';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';
import {
  Account,
  AccountsSchema,
  Character,
  CharactersSchema,
  Entity,
  EntitySchema,
  Guild,
  GuildsSchema,
} from '@app/mongo';
import { OraculumService } from './oraculum.service';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountsSchema },
      { name: Character.name, schema: CharactersSchema },
      { name: Guild.name, schema: GuildsSchema },
      { name: Entity.name, schema: EntitySchema },
    ]),
  ],
  controllers: [],
  providers: [OraculumBuilder, OraculumService],
})
export class OraculumModule {}
