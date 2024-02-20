import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { DmaController } from './dma.controller';
import { DmaService } from './dma.service';
import { valuationsQueue } from '@app/core';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketEntity } from '@app/pg';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([MarketEntity]),
    /*
    MongooseModule.forFeature([
      { name: Token.name, schema: TokenSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Item.name, schema: ItemsSchema },
      { name: Gold.name, schema: GoldsSchema },
      { name: Auction.name, schema: AuctionsSchema },
      { name: Valuations.name, schema: ValuationsSchema },
    ]),*/
    RedisModule.forRoot({
      config: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
        },
      },
    }),
    BullModule.registerQueue({
      queueName: valuationsQueue.name,
      options: valuationsQueue.options,
    }),
  ],
  controllers: [DmaController],
  providers: [DmaService],
})
export class DmaModule {}
