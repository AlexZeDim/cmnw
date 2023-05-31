import { Job } from 'bullmq';
import { realmsQueue, IRealm, REALM_TICKER, IConnectedRealm } from '@app/core';
import { Logger } from '@nestjs/common';
import { BlizzAPI, BattleNetOptions } from 'blizzapi';
import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';

@BullWorker({ queueName: realmsQueue.name })
export class RealmsWorker {
  private readonly logger = new Logger(RealmsWorker.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
  ) {}

  @BullWorkerProcess(realmsQueue.workerOptions)
  public async process(job: Job): Promise<void> {
    try {
      const args: IRealm & BattleNetOptions = { ...job.data };

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
      // TODO review the region, for Bnet
      const keys: string[] = [
        'name',
        'category',
        'race',
        'timezone',
        'is_tournament',
        'slug',
      ];
      const keysNamed: string[] = ['region', 'type'];

      await job.updateProgress(20);

      await Promise.all(
        Object.entries(response).map(async ([key, value]) => {
          if (keys.includes(key) && value) realmEntity[key] = value;
          if (key === 'id' && value) {
            realmEntity.id = value;
            await job.updateProgress(25);
          }
          if (key === 'name' && value) {
            if (typeof value === 'string' && REALM_TICKER.has(value))
              realmEntity.ticker = REALM_TICKER.get(value);
            if (
              typeof value === 'object' &&
              'name' in value &&
              REALM_TICKER.has(value.name)
            )
              realmEntity.ticker = REALM_TICKER.get(value.name);
            await job.updateProgress(30);
          }
          if (
            keysNamed.includes(key) &&
            typeof value === 'object' &&
            value !== null &&
            'name' in value
          ) {
            if (value.name) realmEntity[key] = value.name;
          }
          if (key === 'locale' && value) {
            realmEntity.locale = value.match(/../g).join('_');
            if (value !== 'enGB') {
              const realm_locale: Record<string, any> = await this.BNet.query(
                `/data/wow/realm/${args.slug}`,
                {
                  timeout: 10000,
                  params: { locale: realmEntity.locale },
                  headers: { 'Battlenet-Namespace': 'dynamic-eu' },
                },
              );
              await job.updateProgress(40);
              if (realm_locale && realm_locale.name) {
                realmEntity.localeName = realm_locale.name;
                realmEntity.localeSlug = realm_locale.name;
              }
            } else if ('name' in response) {
              realmEntity.localeName = response.name;
              realmEntity.localeSlug = response.name;
            }
          }
          if (key === 'connected_realm' && value && value.href) {
            const connectedRealmId: number = parseInt(value.href.replace(/\D/g, ''));
            if (connectedRealmId && !isNaN(connectedRealmId)) {
              const connected_realm: IConnectedRealm = await this.BNet.query(
                `/data/wow/connected-realm/${connectedRealmId}`,
                {
                  timeout: 10000,
                  params: { locale: 'en_GB' },
                  headers: { 'Battlenet-Namespace': 'dynamic-eu' },
                },
              );
              await job.updateProgress(50);
              if (connected_realm) {
                if (connected_realm.id)
                  realmEntity.connectedRealmId = parseInt(connected_realm.id);
                // if (connected_realm.has_queue)
                // realmEntity.has_queue = connected_realm.has_queue;
                if (connected_realm.status && connected_realm.status.name)
                  realmEntity.status = connected_realm.status.name;
                if (connected_realm.population && connected_realm.population.name)
                  realmEntity.populationStatus = connected_realm.population.name;
                if (
                  connected_realm.realms &&
                  Array.isArray(connected_realm.realms) &&
                  connected_realm.realms.length
                ) {
                  realmEntity.connectedRealms = connected_realm.realms.map(
                    ({ slug }) => slug,
                  );
                }
              }
            }
          }
        }),
      );

      await this.realmsRepository.save(realmEntity);
      await job.updateProgress(100);
    } catch (errorException) {
      this.logger.error(`${RealmsWorker.name}: ${errorException}`);
    }
  }
}
