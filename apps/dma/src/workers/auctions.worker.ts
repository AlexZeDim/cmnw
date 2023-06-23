import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { Job } from 'bullmq';
import { bufferCount, concatMap } from 'rxjs/operators';
import { from, lastValueFrom } from 'rxjs';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  AuctionItemExtra,
  AuctionJobQueue,
  auctionsQueue,
  BlizzardApiAuctions,
  DMA_TIMEOUT_TOLERANCE,
  IAuctionsOrder,
  ICommodityOrder,
  IPetList,
  isAuctions,
  toGold,
  transformPrice,
} from '@app/core';

@BullWorker({ queueName: auctionsQueue.name })
export class AuctionsWorker {
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
  ) {}

  @BullWorkerProcess(auctionsQueue.workerOptions)
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
       * @description If no connected realm passed, then deal with it, as COMMDTY
       * @description Else, it's an auctions request
       */
      const isCommdty = job.name === 'COMMDTY' && args.connectedRealmId === 1;

      const previousTimestamp = isCommdty
        ? args.commoditiesTimestamp
        : args.auctionsTimestamp;

      const ifModifiedSince = DateTime.fromMillis(previousTimestamp).toHTTP();

      const getMarketApiEndpoint = isCommdty
        ? '/data/wow/auctions/commodities'
        : `/data/wow/connected-realm/${args.connectedRealmId}/auctions`;

      await job.updateProgress(10);

      const auctionsResponse = await this.BNet.query<BlizzardApiAuctions>(
        getMarketApiEndpoint,
        apiConstParams(
          API_HEADERS_ENUM.DYNAMIC,
          DMA_TIMEOUT_TOLERANCE,
          ifModifiedSince,
        ),
      );

      const isAuctionsValid = isAuctions(auctionsResponse);
      if (!isAuctionsValid) return 504;

      await job.updateProgress(15);

      const connectedRealmId = isCommdty ? args.connectedRealmId : 1;
      const timestamp = DateTime.fromRFC2822(
        auctionsResponse.lastModified,
      ).toMillis();

      const { auctions } = auctionsResponse;

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
                isCommdty,
              );

              await this.marketRepository.save(ordersBulkAuctions);
              iterator += ordersBulkAuctions.length;
              this.logger.log(`ordersBatch: ${connectedRealmId}| ${iterator}`);
            } catch (errorException) {
              this.logger.error(`ordersBatch: ${errorException}`);
            }
          }),
        ),
      );

      const updateQuery = isCommdty
        ? { auctionsTimestamp: timestamp }
        : { commoditiesTimestamp: timestamp };

      await job.updateProgress(90);
      await this.realmsRepository.update(
        { connectedRealmId: connectedRealmId },
        updateQuery,
      );

      await job.updateProgress(100);

      return 200;
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`${AuctionsWorker.name}: ${errorException}`);
      return 500;
    }
  }

  private transformOrders(
    orders: Array<IAuctionsOrder | ICommodityOrder>,
    timestamp: number,
    connectedRealmId: number,
    isCommdty: boolean,
  ) {
    return orders.map((order) => {
      if (!order.item.id) return;
      const marketEntity = this.marketRepository.create({
        itemId: order.item.id,
        connectedRealmId: connectedRealmId,
        timestamp: timestamp,
      });

      const isPetOrder = marketEntity.itemId === 82800;

      const bid = 'bid' in order ? toGold((order as IAuctionsOrder).bid) : null;

      const price = transformPrice(order);
      if (!price) return;

      if (!isCommdty) {
        const itemKeyGuard = new Map<string, keyof AuctionItemExtra>([
          ['bonus_lists', 'bonusList'],
          ['context', 'context'],
          ['modifiers', 'modifiers'],
        ]);

        for (const [path, key] of itemKeyGuard.entries()) {
          if (path in order.item) marketEntity[key] = order.item[path];
        }

        if (isPetOrder) {
          // TODO pet fix for pet cage item
          const petsKeyGuard = new Map<string, keyof IPetList>([
            ['pet_breed_id', 'petBreedId'],
            ['pet_level', 'petLevel'],
            ['pet_quality_id', 'petQualityId'],
            ['pet_species_id', 'petSpeciesId'],
          ]);

          const petList: Partial<IPetList> = {};
          for (const [path, key] of petsKeyGuard.entries()) {
            if (path in order.item) petList[key] = order.item[path];
          }
        }
      }

      const quantity = 'quantity' in order ? (order as ICommodityOrder).quantity : 1;

      if (bid) marketEntity.bid = bid;
      if (price) marketEntity.price = price;
      if (quantity) marketEntity.quantity = quantity;

      return marketEntity;
    });
  }
}
