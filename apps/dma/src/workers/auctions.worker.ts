import Redis from 'ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { Job } from 'bullmq';
import { bufferCount, concatMap } from 'rxjs/operators';
import { from, lastValueFrom } from 'rxjs';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  AuctionJobQueue,
  auctionsQueue,
  BlizzardApiAuctions,
  DMA_TIMEOUT_TOLERANCE,
  IAuctionsOrder,
  ICommodityOrder,
  IPetList,
  isAuctions,
  ITEM_KEY_GUARD,
  MARKET_TYPE,
  PETS_KEY_GUARD,
  REALM_ENTITY_ANY,
  toGold,
  transformPrice,
} from '@app/core';
import { Processor, WorkerHost } from '@nestjs/bullmq';

@Processor(auctionsQueue.name, auctionsQueue.workerOptions)
@Injectable()
export class AuctionsWorker extends WorkerHost {
  private readonly logger = new Logger(AuctionsWorker.name, {
    timestamp: true,
  });

  private BNet: BlizzAPI;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
  ) {
    super();
  }

  public async process(job: Job<AuctionJobQueue, number>): Promise<number> {
    try {
      const { data: args } = job;
      await job.updateProgress(5);

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });
      /**
       * @description If no connected realm passed, then deal with it, as COMMODITY
       * @description Else, it's an auctions' request
       */
      const isCommodity = job.name === 'COMMODITY' && args.connectedRealmId === REALM_ENTITY_ANY.id;

      const previousTimestamp = isCommodity
        ? args.commoditiesTimestamp
        : args.auctionsTimestamp;

      const ifModifiedSince = DateTime.fromMillis(previousTimestamp).toHTTP();
      const getMarketApiEndpoint = isCommodity
        ? '/data/wow/auctions/commodities'
        : `/data/wow/connected-realm/${args.connectedRealmId}/auctions`;

      await job.updateProgress(10);

      const marketResponse = await this.BNet.query<BlizzardApiAuctions>(
        getMarketApiEndpoint,
        apiConstParams(
          API_HEADERS_ENUM.DYNAMIC,
          DMA_TIMEOUT_TOLERANCE,
          false,
          ifModifiedSince,
        ),
      );

      const isAuctionsValid = isAuctions(marketResponse);
      if (!isAuctionsValid) return 504;

      await job.updateProgress(15);

      const connectedRealmId = isCommodity ? 1 : args.connectedRealmId;
      const timestamp = DateTime.fromRFC2822(
        marketResponse.lastModified,
      ).toMillis();

      const { auctions } = marketResponse;

      let iterator = 0;

      await lastValueFrom(
        from(auctions).pipe(
          bufferCount(5_000),
          concatMap(async (ordersBatch) => {
            try {
              const ordersBulkAuctions = this.transformOrders(
                ordersBatch,
                timestamp,
                connectedRealmId,
                isCommodity,
              );

              await this.marketRepository.save(ordersBulkAuctions);
              iterator += ordersBulkAuctions.length;
              this.logger.log(`${connectedRealmId} | ${iterator}`);
            } catch (errorOrException) {
              this.logger.error(`ordersBatch ${errorOrException}`);
            }
          }),
        ),
      );

      if (isCommodity) {
        await this.redisService.set(`COMMODITY:TS:${timestamp}`, timestamp);
        await job.updateProgress(80);
      }

      const updateQuery: Partial<RealmsEntity> = isCommodity
        ? { commoditiesTimestamp: timestamp }
        : { auctionsTimestamp: timestamp };

      await job.updateProgress(90);
      await this.realmsRepository.update(
        { connectedRealmId: connectedRealmId },
        updateQuery,
      );

      await job.updateProgress(100);

      return 200;
    } catch (errorOrException) {
      await job.log(errorOrException);
      this.logger.error(errorOrException);
      return 500;
    }
  }

  private transformOrders(
    orders: Array<IAuctionsOrder | ICommodityOrder>,
    timestamp: number,
    connectedRealmId: number,
    isCommodity: boolean,
  ) {
    return orders.map((order) => {
      if (!order.item.id) return;
      const marketEntity = this.marketRepository.create({
        orderId: `${order.id}`,
        itemId: order.item.id,
        connectedRealmId: connectedRealmId,
        timeLeft: order.time_left,
        timestamp: timestamp,
      });

      const isPetOrder = marketEntity.itemId === 82800;

      const bid = 'bid' in order ? toGold((order as IAuctionsOrder).bid) : null;

      const price = transformPrice(order);
      if (!price) return;

      if (!isCommodity) {
        for (const [path, key] of ITEM_KEY_GUARD.entries()) {
          if (path in order.item) marketEntity[key] = order.item[path];
        }

        if (isPetOrder) {
          // TODO pet fix for pet cage item
          const petList: Partial<IPetList> = {};
          for (const [path, key] of PETS_KEY_GUARD.entries()) {
            if (path in order.item) petList[key] = order.item[path];
          }
        }
      }

      const quantity = 'quantity' in order ? (order as ICommodityOrder).quantity : 1;

      marketEntity.type = isCommodity ? MARKET_TYPE.C : MARKET_TYPE.A;
      if (bid) marketEntity.bid = bid;
      if (price) marketEntity.price = price;
      if (quantity) marketEntity.quantity = quantity;

      const isValue = Boolean(price) && Boolean(quantity);
      if (isValue) marketEntity.value = price * quantity;

      return marketEntity;
    });
  }
}
