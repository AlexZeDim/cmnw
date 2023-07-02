import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { BlizzAPI } from 'blizzapi';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { lastValueFrom, mergeMap, range } from 'rxjs';
import {
  findRealm,
  getKeys,
  GLOBAL_KEY,
  REALM_ENTITY_ANY,
  RealmJobQueue,
  realmsQueue,
} from '@app/core';

@Injectable()
export class RealmsService implements OnModuleInit {
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

  async onModuleInit(): Promise<void> {
    await this.init();
    await this.indexRealms(GLOBAL_KEY);
    await this.getRealmsWarcraftLogsID();
  }

  async init() {
    const anyRealmEntity = this.realmsRepository.create(REALM_ENTITY_ANY);
    await this.realmsRepository.save(anyRealmEntity);
    this.logger.log(`init: Realm AANNYY was seeded`);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexRealms(clearance: string = GLOBAL_KEY): Promise<void> {
    try {
      const [keyEntity] = await getKeys(this.keysRepository, clearance);

      await this.queue.drain(true);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
      });

      const { realms: realmList }: Record<string, any> = await this.BNet.query(
        '/data/wow/realm/index',
        {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'dynamic-eu' },
        },
      );

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
    } catch (errorOrException) {
      this.logger.error(`indexRealms: ${errorOrException}`);
    }
  }

  /**
   * Index every realm for WCL id, US:0,246 EU:247,517 (RU: 492) Korea: 517
   * @param from
   * @param to
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  private async getRealmsWarcraftLogsID(from = 246, to = 517): Promise<void> {
    if (from < 1) from = 1;
    const count = Math.abs(from - to);

    await lastValueFrom(
      range(from, count).pipe(
        mergeMap(async (realmId) => {
          try {
            const response = await this.httpService.axiosRef.get<string>(
              `https://www.warcraftlogs.com/server/id/${realmId}`,
            );
            const warcraftLogsPage = cheerio.load(response.data);
            const warcraftLogsRealmElement = warcraftLogsPage.html('.server-name');
            const realmName = warcraftLogsPage(warcraftLogsRealmElement).text();
            const realmEntity = await findRealm(this.realmsRepository, realmName);
            if (!realmEntity) {
              throw new NotFoundException(`${realmId}:${realmName} not found!`);
            }

            await this.realmsRepository.update(
              { id: realmEntity.id },
              { warcraftLogsId: realmId },
            );

            this.logger.debug(
              `getRealmsWarcraftLogsID: ${realmId}:${realmName} | ${realmEntity.id} updated!`,
            );
          } catch (errorOrException) {
            this.logger.error(`getRealmsWarcraftLogsID: ${errorOrException}`);
          }
        }, 2),
      ),
    );
  }
  // TODO populations & stats
}
