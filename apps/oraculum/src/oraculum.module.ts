import { Module } from '@nestjs/common';
import { OraculumService } from './oraculum.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';
import { Account, AccountsSchema, Character, CharactersSchema, Guild, GuildsSchema } from '@app/mongo';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountsSchema },
      { name: Character.name, schema: CharactersSchema },
      { name: Guild.name, schema: GuildsSchema },
    ]),
  ],
  controllers: [],
  providers: [OraculumService],
})
export class OraculumModule {}
