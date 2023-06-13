import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { range } from 'lodash';
import * as cheerio from 'cheerio';
import { BlizzAPI } from 'blizzapi';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { ArrayContains, Repository } from 'typeorm';
import { GLOBAL_KEY, RealmJobQueue, realmsQueue } from '@app/core';

@Injectable()
export class RealmsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RealmsService.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @BullQueueInject(realmsQueue.name)
    private readonly queue: Queue<RealmJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexRealms(GLOBAL_KEY);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexRealms(clearance: string = GLOBAL_KEY): Promise<void> {
    try {
      const keyEntity = await this.keysRepository.findOneBy({
        tags: ArrayContains([clearance]),
      });
      if (!keyEntity || !keyEntity.token) {
        this.logger.error(`indexRealms: clearance: ${clearance} key not found`);
        return;
      }

      await this.queue.drain(true);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
      });

      const { realms: realmList } = await this.BNet.query('/data/wow/realm/index', {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'dynamic-eu' },
      });

      for (const { id, name, slug } of realmList) {
        this.logger.log(`${id}:${name}`);
        await this.queue.add(
          slug,
          {
            id: id,
            name: name,
            slug: slug,
            region: 'eu',
            clientId: keyEntity.client,
            clientSecret: keyEntity.secret,
            accessToken: keyEntity.token,
          },
          {
            jobId: slug,
          },
        );
      }
    } catch (errorException) {
      this.logger.error(`indexRealms: ${errorException}`);
    }
  }

  /**
   * Index every realm for WCL id, US:0,246 EU:247,517 (RU: 492) Korea: 517
   * @param start
   * @param end
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  private async getRealmsWarcraftLogsID(start = 1, end = 517): Promise<void> {
    try {
      if (start < 1) start = 1;
      const warcraftLogsIds: number[] = range(start, end + 1, 1);
      for (const warcraftLogsId of warcraftLogsIds) {
        const response = await this.httpService.axiosRef.get<any>(
          `https://www.warcraftlogs.com/server/id/${warcraftLogsId}`,
        );
        const wclHTML = cheerio.load(response.data);
        const serverElement = wclHTML.html('.server-name');
        const realmName = wclHTML(serverElement).text();
        if (!!realmName) {
          let realmEntity = await this.realmsRepository.findOneBy({
            name: realmName,
          });

          if (!realmEntity) {
            realmEntity = await this.realmsRepository.findOneBy({
              localeName: realmName,
            });
          }

          if (realmEntity) {
            await this.realmsRepository.update(
              { id: realmEntity.id },
              { warcraftLogsId: warcraftLogsId },
            );
          }

          this.logger.debug(`${warcraftLogsId}:${realmName}, ${realmEntity.id}`);
        }
      }
    } catch (errorException) {
      this.logger.error(`getRealmsWarcraftLogsID: ${errorException}`);
    }
  }

  // TODO populations & stats
}
