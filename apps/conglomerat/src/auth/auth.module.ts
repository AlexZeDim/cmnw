import { HttpModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig } from '@app/configuration';
import { Account, AccountsSchema } from '@app/mongo';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordStrategy } from './strategies/discord.strategy';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountsSchema }
    ]),
    HttpModule,
  ],
  providers: [AuthService, DiscordStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
