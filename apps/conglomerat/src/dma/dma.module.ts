import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { DmaController } from './dma.controller';
import { DmaService } from './dma.service';
import { Auction, AuctionsSchema, Gold, GoldsSchema, Item, ItemsSchema, Realm, RealmsSchema } from '@app/mongo';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([
      { name: Realm.name, schema: RealmsSchema },
      { name: Item.name, schema: ItemsSchema },
      { name: Gold.name, schema: GoldsSchema },
      { name: Auction.name, schema: AuctionsSchema },
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    })
  ],
  controllers: [DmaController],
  providers: [DmaService],
})
export class DmaModule {}
