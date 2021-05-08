import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';
import { Character, CharactersSchema, Subscription, SubscriptionsSchema } from '@app/mongo';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Character.name, schema: CharactersSchema },
      { name: Subscription.name, schema: SubscriptionsSchema }
    ])
  ],
  controllers: [],
  providers: [DiscordService],
})
export class DiscordModule {}
