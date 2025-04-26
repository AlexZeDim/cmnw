import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractEntity, ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { CONTRACT_TYPE, getPercentileTypeByItemAndTimestamp, GOLD_ITEM_ENTITY, REALM_ENTITY_ANY } from '@app/core';
import { item } from '../../tests/mocks';

@Injectable()
export class ContractsService {
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


  async t() {
    try {

    } catch (errorOrException) {
      this.logger.error(`buildCommodityIntradayContracts ${errorOrException}`);
    }
  }

  @Cron('00 10,18 * * *')
  async buildCommodityIntradayContracts() {
    try {
      this.logger.log('buildCommodityIntradayContracts started');

      const commodityRealmEntity = await this.realmsRepository.findOne({
        where: { id: REALM_ENTITY_ANY.id },
        select: ['commoditiesTimestamp'],
      });

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

      const commodityItemsIds = commodityItems.map((item) => item.itemId);


      const today = DateTime.now();
      const ytd = today.minus({ days: 1 }).toMillis();
      const weekAgo = today.minus({ days: 7 }).toMillis();


      const timestamps = this.marketRepository
        .createQueryBuilder('m')
        .where({
          connectedRealmId: REALM_ENTITY_ANY.connectedRealmId,
          timestamp: MoreThan(ytd),
        })
        .select('markets.timestamp', 'timestamp')
        .distinct(true)
        .getRawMany<Pick<MarketEntity, 'timestamp'>>();

/*      const findStage = {
          itemId: item.id,
          // TODO timestamp from ytd
          timestamp: MoreThan(commodityRealmEntity.auctionsTimestamp),
          // TODO quantity only moreThen
        };*/

      // TODO we could extract distinct timestamps for fieldAggregations



      await lastValueFrom(
        from(timestamps).pipe(
          mergeMap(async (timestamp) => {
            // TODO test

          }, 5),
        ),
      );
    } catch (errorOrException) {
      this.logger.error(`buildCommodityIntradayContracts ${errorOrException}`);
    }
  }

  async getItemContractIntradayData(itemId: number, timestamp: number, today: DateTime) {
    const contractId = `${itemId}-${today.day}.${today.month}@${timestamp}`;

    try {

      const itemPriceAndQuantity = await this.marketRepository
        .createQueryBuilder('m')
        .where({
          itemId: itemId,
          timestamp: timestamp,
        })
        .addSelect('SUM(m.quantity)', 'q')
        .addSelect('MIN(m.price)', 'p')
        .getRawOne<any>();

      const percentile98 = await getPercentileTypeByItemAndTimestamp(
        this.marketRepository, 'DISC', 0.98, itemId, timestamp
      );

      const itemOpenInterest = await this.marketRepository
        .createQueryBuilder('m')
        .where({
          itemId: itemId,
          timestamp: timestamp,
          price: LessThan(percentile98),
        })
        .select('SUM(m.value)', 'oi')
        .getRawOne<any>();


      const isContractExists = await this.contractRepository.exist({
        where: {
          id: contractId,
        },
      });

      if (isContractExists) return;

      const contractEntity = this.contractRepository.create({
        id: contractId,
        itemId: itemId,
        connectedRealmId: 1,
        timestamp: timestamp,
        day: today.day,
        week: today.weekNumber,
        month: today.month,
        year: today.year,
        price: itemPriceAndQuantity.p,
        quantity: itemPriceAndQuantity.q,
        openInterest: itemOpenInterest.oi,
        type: CONTRACT_TYPE.I,
      });

      await this.contractRepository.save(contractEntity);

    } catch (errorOrException) {
      this.logger.error(`${contractId}::${errorOrException}`);
    }
  }

  async buildGoldIntradayContracts() {
    try {
      this.logger.log('buildGoldIntradayContracts started');

      const filter = {
        itemId: item.id,
        // TODO timestamp from ytd
        timestamp: MoreThan(commodityRealmEntity.goldTimestamp),
        isOnline: true,
        // TODO quantity only moreThen
      };

      const goldItemEntity = await this.itemsRepository.findOneBy({
        ticker: GOLD_ITEM_ENTITY.ticker,
      });

    } catch (errorOrException) {
      this.logger.error(`buildGoldIntradayContracts ${errorOrException}`);
    }
  }
}
