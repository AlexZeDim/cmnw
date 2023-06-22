import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import {
  AuctionJobQueue,
  auctionsQueue,
  delay,
  getKeys,
  GLOBAL_DMA_KEY,
  IAARealm,
  IPetType,
} from '@app/core';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { from, lastValueFrom, mergeMap } from 'rxjs';

@Injectable()
export class AuctionsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuctionsService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @BullQueueInject(auctionsQueue.name)
    private readonly queue: Queue<AuctionJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexCommodity(GLOBAL_DMA_KEY);
  }

  private async indexAuctions(clearance: string = GLOBAL_DMA_KEY): Promise<void> {
    try {
      await delay(30);
      await this.queue.drain(true);

      const [keyEntity] = await getKeys(this.keysRepository, clearance, true);
      const offsetTime = DateTime.now().minus({ minutes: 30 }).toMillis();

      const realmsEntity = await this.realmsRepository
        .createQueryBuilder('realms')
        .where({ id: LessThan(offsetTime) })
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
            });
          }),
        ),
      );
    } catch (errorException) {
      this.logger.error(`indexAuctions: ${errorException}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexCommodity(clearance: string = GLOBAL_DMA_KEY) {
    try {
      const [keyEntity] = await getKeys(this.keysRepository, clearance, true);

      await this.queue.add('COMMDTY', {
        region: 'eu',
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
      });
    } catch (errorException) {
      this.logger.error(`indexCommodity: ${errorException}`);
    }
  }
}
