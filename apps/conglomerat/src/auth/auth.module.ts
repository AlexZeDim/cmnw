import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig } from '@app/configuration';
import { Account, AccountsSchema } from '@app/mongo';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordStrategy } from './strategies/discord.strategy';
import { BattleNetStrategy } from './strategies/battle-net.strategy';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountsSchema }
    ]),
  ],
  providers: [AuthService, DiscordStrategy, BattleNetStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
