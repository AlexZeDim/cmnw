import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractEntity, ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { MoreThan, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { CONTRACT_TYPE } from '@app/core';

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

  @Cron('00 10,18 * * *')
  async buildContracts() {
    this.logger.log('buildContracts started');

    const realmEntity = await this.realmsRepository.findOne({
      where: { region: 'Europe' },
      select: ['auctionsTimestamp'],
      order: { auctionsTimestamp: 'ASC' },
    });

    const today = DateTime.now();
    const ytd = today.minus({ days: 7 }).toMillis();

    const itemsEntity = await this.itemsRepository.findBy({
      hasContracts: true,
    });

    const [item] = itemsEntity;

    const isGold = item.id === 1;

    const findStage = isGold
      ? {
          itemId: item.id,
          // TODO timestamp from ytd
          timestamp: MoreThan(realmEntity.goldTimestamp),
          isOnline: true,
          // TODO quantity only moreThen
        }
      : {
          itemId: item.id,
          // TODO timestamp from ytd
          timestamp: MoreThan(realmEntity.auctionsTimestamp),
          // TODO quantity only moreThen
        };

    // TODO we could extract distinct timestamps for fieldAggregations
    const timestamp = isGold
      ? realmEntity.goldTimestamp
      : realmEntity.auctionsTimestamp;

    const timestamps = await this.marketRepository
      .createQueryBuilder('m')
      .select('DISTINCT(timestamp)')
      .where({
        timestamp: MoreThan(timestamp),
      });

    await lastValueFrom(
      from(timestamps as unknown as number[]).pipe(
        mergeMap(async (timestamp) => {
          // TODO test
          const contractData = await this.marketRepository
            .createQueryBuilder('m')
            .where({
              timestamp: timestamp,
            })
            .addSelect('SUM(m.quantity)', 'q')
            .addSelect('MIN(m.price)', 'p')
            .addSelect('m.price*m.quantity', 'oi')
            .getRawOne<any>();

          const contractId = `${item.id}-${today.day}.${today.month}@${timestamp}`;

          const isContractExists = await this.contractRepository.exist({
            where: {
              id: contractId,
            },
          });

          if (isContractExists) return;

          const contractEntity = this.contractRepository.create({
            id: contractId,
            itemId: item.id,
            connectedRealmId: 1,
            timestamp: timestamp,
            day: today.day,
            week: today.weekNumber,
            month: today.month,
            year: today.year,
            price: contractData.p,
            quantity: contractData.q,
            openInterest: contractData.oi,
            type: CONTRACT_TYPE.I,
          });

          await this.contractRepository.save(contractEntity);
        }, 5),
      ),
    );
  }
}
