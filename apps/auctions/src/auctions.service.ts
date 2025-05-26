import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { LessThan, Repository } from 'typeorm';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { BlizzAPI } from 'blizzapi';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  AuctionJobQueue,
  auctionsQueue,
  BlizzardApiWowToken,
  delay,
  getKey,
  getKeys,
  GLOBAL_DMA_KEY,
  isWowToken,
  MARKET_TYPE, REALM_ENTITY_ANY,
  toGold,
  TOLERANCE_ENUM, WOW_TOKEN_ITEM_ID,
} from '@app/core';

@Injectable()
export class AuctionsService implements OnApplicationBootstrap {
  private BNet: BlizzAPI;
  private readonly logger = new Logger(AuctionsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @BullQueueInject(auctionsQueue.name)
    private readonly queue: Queue<AuctionJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexAuctions(GLOBAL_DMA_KEY);
    await this.indexCommodity(GLOBAL_DMA_KEY);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async indexAuctions(clearance: string = GLOBAL_DMA_KEY): Promise<void> {
    try {
      await delay(30);
      await this.queue.drain(true);

      const [keyEntity] = await getKeys(this.keysRepository, clearance, true);
      const offsetTime = DateTime.now().minus({ minutes: 30 }).toMillis();

      const realmsEntity = await this.realmsRepository
        .createQueryBuilder('realms')
        .where({ auctionsTimestamp: LessThan(offsetTime) })
        .distinctOn(['realms.connectedRealmId'])
        .getMany();

      await lastValueFrom(
        from(realmsEntity).pipe(
          mergeMap(async (realmEntity) => {
            await this.queue.add(`${realmEntity.name}`, {
              connectedRealmId: realmEntity.connectedRealmId,
              auctionsTimestamp: realmEntity.auctionsTimestamp,
              region: 'eu',
              clientId: keyEntity.client,
              clientSecret: keyEntity.secret,
              accessToken: keyEntity.token,
              isAssetClassIndex: true,
            });

            this.logger.debug(
              `realm: ${realmEntity.connectedRealmId} | ts: ${
                realmEntity.auctionsTimestamp
              }, ${typeof realmEntity.auctionsTimestamp}`,
            );
          }),
        ),
      );
    } catch (errorOrException) {
      this.logger.error(`indexAuctions ${errorOrException}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexCommodity(clearance: string = GLOBAL_DMA_KEY) {
    try {
      const [keyEntity] = await getKeys(this.keysRepository, clearance, true);

      const realmEntity = await this.realmsRepository.findOneBy({
        connectedRealmId: REALM_ENTITY_ANY.id,
      });

      const commodityJob = await this.queue.getJob('COMMODITY');
      const isCommodityJobActive = await commodityJob.isActive();

      if (isCommodityJobActive) {
        this.logger.debug(`realm: ${realmEntity.connectedRealmId} | active`);
        return;
      }

      await this.queue.add('COMMODITY', {
        region: 'eu',
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
        connectedRealmId: realmEntity.connectedRealmId,
        commoditiesTimestamp: realmEntity.commoditiesTimestamp,
        isAssetClassIndex: true,
      });

      this.logger.debug(
        `realm: ${realmEntity.connectedRealmId} | ts: ${realmEntity.commoditiesTimestamp}`,
      );
    } catch (errorOrException) {
      this.logger.error(`indexCommodity ${errorOrException}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexTokens(clearance: string = GLOBAL_DMA_KEY): Promise<void> {
    try {
      const key = await getKey(this.keysRepository, clearance);
      const redisKey = `WOWTOKEN:TS`;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const lts = await this.redisService.get(redisKey);
      const ifModifiedSince = lts
        ? DateTime.fromMillis(Number(lts)).toHTTP()
        : undefined;

      const response = await this.BNet.query<BlizzardApiWowToken>(
        '/data/wow/token/index',
        apiConstParams(
          API_HEADERS_ENUM.DYNAMIC,
          TOLERANCE_ENUM.DMA,
          false,
          ifModifiedSince,
        ),
      );

      const isWowTokenValid = isWowToken(response);
      if (!isWowTokenValid) {
        this.logger.error(`Token response not valid`);
        return;
      }

      const { price, lastModified, last_updated_timestamp: timestamp } = response;

      const isWowTokenExists = await this.marketRepository.exist({
        where: {
          timestamp: timestamp,
          itemId: 1,
          connectedRealmId: REALM_ENTITY_ANY.id,
          type: MARKET_TYPE.T,
        },
      });

      if (isWowTokenExists) {
        this.logger.debug(
          `Token exists on timestamp ${timestamp} | ${lastModified}`,
        );
        return;
      }

      const wowTokenEntity = this.marketRepository.create({
        orderId: `${timestamp}`,
        price: toGold(price),
        itemId: WOW_TOKEN_ITEM_ID,
        quantity: 1,
        connectedRealmId: REALM_ENTITY_ANY.id,
        type: MARKET_TYPE.T,
        timestamp,
      });

      await this.redisService.set(redisKey, timestamp);
      await this.marketRepository.save(wowTokenEntity);
    } catch (errorOrException) {
      this.logger.error(errorOrException);
    }
  }
}
