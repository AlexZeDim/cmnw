import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractEntity, ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { LessThan, MoreThan, Not, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import {
  CONTRACT_TYPE,
  GOLD_ITEM_ENTITY,
  REALM_ENTITY_ANY,
  getPercentileTypeByItemAndTimestamp,
  IItemOpenInterest,
  IItemPriceAndQuantity,
  isContractArraysEmpty,
  WOW_TOKEN_ITEM_ID,
} from '@app/core';

@Injectable()
export class ContractsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContractsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(ContractEntity)
    private readonly contractRepository: Repository<ContractEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.setCommodityItemsAsContracts();
    await this.buildCommodityTimestampContracts();
  }


  private async setCommodityItemsAsContracts() {
    try {
      const commodityItems = await this.marketRepository
        .createQueryBuilder('markets')
        .where({ connectedRealmId: REALM_ENTITY_ANY.connectedRealmId })
        .select('markets.item_id', 'itemId')
        .distinct(true)
        .getRawMany<Pick<MarketEntity, 'itemId'>>();

      const commodityItemsIds = commodityItems.map((item) => item.itemId);

      const result = await this.itemsRepository
        .createQueryBuilder()
        .update()
        .set({ hasContracts: true })
        .whereInIds(commodityItemsIds)
        .execute();

      const contractItems = commodityItemsIds.length;
      const updateResult = result.affected || 0;

      this.logger.log(`setCommodityItemsAsContracts: ${contractItems} || ${updateResult}`);

      return updateResult;
    } catch (errorOrException) {
      this.logger.error(`setCommodityItemsAsContracts ${errorOrException}`);
    }
  }

  @Cron('00 10,18 * * *')
  private async buildCommodityTimestampContracts() {
    try {
      this.logger.log('buildCommodityTimestampContracts started');

      // @todo variation
      // const itemsEntity = await this.itemsRepository.findBy({
      //   hasContracts: true,
      // });

      const commodityItems = await this.marketRepository
        .createQueryBuilder('markets')
        .where({ connectedRealmId: REALM_ENTITY_ANY.connectedRealmId })
        .select('markets.item_id', 'itemId')
        .distinct(true)
        .getRawMany<Pick<MarketEntity, 'itemId'>>();

      const today = DateTime.now();
      const ytd = today.minus({ days: 1 }).toMillis();

      const timestamps = await this.marketRepository
        .createQueryBuilder('markets')
        .where({
          connectedRealmId: REALM_ENTITY_ANY.connectedRealmId,
          itemId: Not(WOW_TOKEN_ITEM_ID),
          timestamp: MoreThan(ytd),
        })
        .select('markets.timestamp', 'timestamp')
        .distinct(true)
        .getRawMany<Pick<MarketEntity, 'timestamp'>>();

      const commodityItemsIds = commodityItems.map((item) => item.itemId);
      const commodityTimestamps = timestamps.map((t) => t.timestamp);

      this.logger.log(`buildCommodityTimestampContracts: items ${commodityItemsIds.length} || timestamps ${commodityTimestamps.length} || today ${today.toISO()} || ytd ${ytd}`);

      const isGuard = isContractArraysEmpty(commodityTimestamps, commodityItemsIds);
      if (isGuard) {
        this.logger.warn('buildCommodityTimestampContracts empty');
        return;
      }

      for (const commodityItemId of commodityItemsIds) {
        await lastValueFrom(
          from(commodityTimestamps).pipe(
            mergeMap((timestamp) =>
              this.getItemContractIntradayData(commodityItemId, timestamp, today),5),
          ),
        );
      }

    } catch (errorOrException) {
      this.logger.error(`buildCommodityTimestampContracts ${errorOrException}`);
    }
  }

  @Cron('00 10,18 * * *')
  private async buildGoldIntradayContracts() {
    try {
      this.logger.log('buildGoldIntradayContracts started');

      const today = DateTime.now();
      const ytd = today.minus({ days: 1 }).toMillis();

      const realmsEntities = await this.realmsRepository.find({});

      for (const realmEntity of realmsEntities) {
        const timestamps = await this.marketRepository
          .createQueryBuilder('markets')
          .where({
            itemId: GOLD_ITEM_ENTITY.id,
            timestamp: MoreThan(ytd),
            connectedRealmId: realmEntity.connectedRealmId,
          })
          .select('markets.timestamp', 'timestamp')
          .distinct(true)
          .getRawMany<Pick<MarketEntity, 'timestamp'>>();

        const goldTimestamps = timestamps.map((t) => t.timestamp);

        await lastValueFrom(
          from(goldTimestamps).pipe(
            mergeMap((timestamp) =>
              this.getItemContractIntradayData(GOLD_ITEM_ENTITY.id, timestamp, today),5),
          ),
        );
      }

    } catch (errorOrException) {
      this.logger.error(`buildGoldIntradayContracts ${errorOrException}`);
    }
  }

  private async getItemContractIntradayData(
    itemId: number,
    timestamp: number,
    today: DateTime,
    connectedRealmId?: number,
  ) {
    const isGold = itemId === GOLD_ITEM_ENTITY.id;
    const contractId = `${itemId}-${today.day}.${today.month}@${timestamp}`;

    try {
      const isContractExists = await this.contractRepository.exist({
        where: {
          id: contractId,
        },
      });

      if (isContractExists) {
        // this.logger.debug(`${contractId} exists`);
        return;
      }

      const itemPriceAndQuantityWhere = isGold ? {
        connectedRealmId: connectedRealmId,
        itemId: itemId,
        timestamp: timestamp,
        isOnline: true,
      } : {
        itemId: itemId,
        timestamp: timestamp,
      }

      const itemPriceAndQuantity = await this.marketRepository
        .createQueryBuilder('m')
        .where(itemPriceAndQuantityWhere)
        .select('SUM(m.quantity)', 'q')
        .addSelect('MIN(m.price)', 'p')
        .addSelect('COUNT(m.uuid)', 'orders')
        .getRawOne<IItemPriceAndQuantity>();

      const orders = Number(itemPriceAndQuantity.orders);

      if (orders === 0) {
        // this.logger.debug(`${contractId} zero orders`);
        return;
      }

      const [percentile50, percentile98] = await Promise.all([
        await getPercentileTypeByItemAndTimestamp(
          this.marketRepository, 'DISC', 0.5, itemId, timestamp, isGold, connectedRealmId
        ),
        await getPercentileTypeByItemAndTimestamp(
          this.marketRepository, 'DISC', 0.98, itemId, timestamp, isGold, connectedRealmId
        )
      ]);

      const itemOpenInterestWhere =  isGold ? {
        connectedRealmId: connectedRealmId,
        itemId: itemId,
        timestamp: timestamp,
        isOnline: true,
      } : {
        itemId: itemId,
        timestamp: timestamp,
      }

      if (orders) {
        itemOpenInterestWhere['price'] = LessThan(percentile98);
      }

      const itemOpenInterest = await this.marketRepository
        .createQueryBuilder('m')
        .where(itemOpenInterestWhere)
        .select('SUM(m.value)', 'oi')
        .getRawOne<IItemOpenInterest>();

      const contractEntity = this.contractRepository.create({
        id: contractId,
        itemId: itemId,
        connectedRealmId: REALM_ENTITY_ANY.connectedRealmId,
        timestamp: timestamp,
        day: today.day,
        week: today.weekNumber,
        month: today.month,
        year: today.year,
        price: itemPriceAndQuantity.p,
        priceMedian: percentile50,
        priceTop: percentile98,
        quantity: itemPriceAndQuantity.q,
        openInterest: itemOpenInterest.oi,
        type: CONTRACT_TYPE.T,
      });

      await this.contractRepository.save(contractEntity);

      this.logger.log(`${contractId}`);

    } catch (errorOrException) {
      this.logger.error(`${contractId}::${errorOrException}`);
    }
  }
}
