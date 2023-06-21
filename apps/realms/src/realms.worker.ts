import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { get } from 'lodash';
import {
  BlizzardApiResponse,
  IConnectedRealm,
  isFieldNamed,
  REALM_TICKER,
  RealmJobQueue,
  realmsQueue,
  toLocale,
  transformConnectedRealmId,
  transformNamedField,
} from '@app/core';

@BullWorker({ queueName: realmsQueue.name })
export class RealmsWorker {
  private readonly logger = new Logger(RealmsWorker.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {}

  @BullWorkerProcess(realmsQueue.workerOptions)
  public async process(job: Job<RealmJobQueue, number>): Promise<void> {
    try {
      const args: RealmJobQueue = { ...job.data };

      await job.updateProgress(1);

      let realmEntity = await this.realmsRepository.findOneBy({ id: args.id });

      await job.updateProgress(5);

      if (!realmEntity) {
        realmEntity = this.realmsRepository.create({
          id: args.id,
        });
      }

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });

      await job.updateProgress(10);

      const response: Record<string, any> = await this.BNet.query(
        `/data/wow/realm/${args.slug}`,
        {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'dynamic-eu' },
        },
      );

      await job.updateProgress(20);

      realmEntity.id = get(response, 'id', null);
      realmEntity.slug = get(response, 'slug', null);

      await job.updateProgress(25);

      const name = isFieldNamed(response.name)
        ? get(response, 'name.name', null)
        : response.name;

      if (name) realmEntity.name = name;

      const ticker = REALM_TICKER.has(realmEntity.name)
        ? REALM_TICKER.get(realmEntity.name)
        : null;

      if (ticker) realmEntity.ticker = ticker;

      await job.updateProgress(30);

      realmEntity.locale = response.locale ? response.locale : null;

      if (realmEntity.locale != 'enGB') {
        const realmLocale = await this.BNet.query<BlizzardApiResponse>(
          `/data/wow/realm/${args.slug}`,
          {
            timeout: 10000,
            params: { locale: realmEntity.locale },
            headers: { 'Battlenet-Namespace': 'dynamic-eu' },
          },
        );

        await job.updateProgress(40);
        const locale = toLocale(realmEntity.locale);

        const localeName = get(realmLocale, `name.${locale}`, null);
        if (localeName) realmEntity.localeName = localeName;

        const localeSlug = get(realmLocale, `slug.${locale}`, null);
        if (localeSlug) realmEntity.localeSlug = localeSlug;
      } else {
        const localeNameSlug = get(response, 'name', null);
        if (localeNameSlug) {
          realmEntity.localeName = localeNameSlug;
          realmEntity.localeSlug = localeNameSlug;
        }
        await job.updateProgress(45);
      }

      const region = transformNamedField(response.region);
      if (region) realmEntity.region = region;
      if (response.timezone) realmEntity.timezone = response.timezone;

      const category = get(response, 'category', null);
      if (category) realmEntity.category = category;

      const connectedRealmId = transformConnectedRealmId(response);
      if (connectedRealmId) {
        const connectedRealm = await this.BNet.query<IConnectedRealm>(
          `/data/wow/connected-realm/${connectedRealmId}`,
          {
            timeout: 10000,
            params: { locale: 'en_GB' },
            headers: { 'Battlenet-Namespace': 'dynamic-eu' },
          },
        );

        realmEntity.connectedRealmId = get(connectedRealm, 'id', null);
        realmEntity.status = get(connectedRealm, 'status.name', null);
        realmEntity.populationStatus = get(connectedRealm, 'population.name', null);
        await job.updateProgress(50);

        const isRealmsExists =
          'realms' in connectedRealm && Array.isArray(connectedRealm.realms);

        if (isRealmsExists) {
          realmEntity.connectedRealms = connectedRealm.realms.map(
            ({ slug }) => slug,
          );
        }
      }

      await this.realmsRepository.save(realmEntity);
      await job.updateProgress(100);
    } catch (errorException) {
      this.logger.error(`${RealmsWorker.name}: ${errorException}`);
    }
  }
}
