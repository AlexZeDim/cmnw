import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';
import {
  Auction,
  AuctionsSchema,
  Character,
  CharactersSchema,
  Item,
  ItemsSchema,
  Realm,
  RealmsSchema,
  Subscription,
  SubscriptionsSchema,
} from '@app/mongo';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Auction.name, schema: AuctionsSchema },
      { name: Character.name, schema: CharactersSchema },
      { name: Item.name, schema: ItemsSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Subscription.name, schema: SubscriptionsSchema },
    ]),
  ],
  controllers: [],
  providers: [DiscordService],
})
export class DiscordModule {}
