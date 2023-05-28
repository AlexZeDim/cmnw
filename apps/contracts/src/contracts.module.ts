import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';
import {
  Auction, AuctionsSchema,
  Contract, ContractsSchema,
  Gold, GoldsSchema,
  Item, ItemsSchema,
  Realm, RealmsSchema,
} from '@app/mongo';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Realm.name, schema: RealmsSchema },
      { name: Item.name, schema: ItemsSchema },
      { name: Gold.name, schema: GoldsSchema },
      { name: Auction.name, schema: AuctionsSchema },
      { name: Contract.name, schema: ContractsSchema },
    ]),
  ],
  controllers: [],
  providers: [ContractsService],
})
export class ContractsModule {}
