import { Job } from 'bullmq';
import {
  realmsQueue,
  RealmInterface,
  REALM_TICKER,
  ConnectedRealmInterface,
} from '@app/core';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Realm } from '@app/mongo';
import { Model } from 'mongoose';
import { BlizzAPI, BattleNetOptions } from 'blizzapi';
import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';

@BullWorker({ queueName: realmsQueue.name })
export class RealmsWorker {
  private readonly logger = new Logger(
    RealmsWorker.name, { timestamp: true },
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
  ) {}

  @BullWorkerProcess(realmsQueue.workerOptions)
  public async process(job: Job): Promise<void> {
    try {
      const args: RealmInterface & BattleNetOptions = { ...job.data };
      const summary: RealmInterface = { _id: args._id, slug: args.slug };

      await job.updateProgress(1);

      let realm = await this.RealmModel.findById(args._id);

      await job.updateProgress(5);

      if (!realm) {
        realm = new this.RealmModel({
          _id: args._id,
        });
      }

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });

      await job.updateProgress(10);

      const response: Record<string, any> = await this.BNet.query(`/data/wow/realm/${args.slug}`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'dynamic-eu' },
      });
      // TODO review the region, for Bnet
      const keys: string[] = ['name', 'category', 'race', 'timezone', 'is_tournament', 'slug'];
      const keys_named: string[] = ['region', 'type'];

      await job.updateProgress(20);

      await Promise.all(
        Object.entries(response).map(async ([key, value]) => {
          if (keys.includes(key) && value) summary[key] = value;
          if (key === 'id' && value) {
            summary._id = value;
            await job.updateProgress(25);
          }
          if (key === 'name' && value) {
            if (typeof value === 'string' && REALM_TICKER.has(value)) summary.ticker = REALM_TICKER.get(value);
            if (typeof value === 'object' && 'name' in value && REALM_TICKER.has(value.name)) summary.ticker = REALM_TICKER.get(value.name);
            await job.updateProgress(30);
          }
          if (keys_named.includes(key) && typeof value === 'object' && value !== null && 'name' in value) {
            if (value.name) summary[key] = value.name;
          }
          if (key === 'locale' && value) {
            summary.locale = value.match(/../g).join('_');
            if (value !== 'enGB') {
              const realm_locale: Record<string, any> = await this.BNet.query(`/data/wow/realm/${args.slug}`, {
                timeout: 10000,
                params: { locale: summary.locale },
                headers: { 'Battlenet-Namespace': 'dynamic-eu' },
              });
              await job.updateProgress(40);
              if (realm_locale && realm_locale.name) {
                summary.name_locale = realm_locale.name;
                summary.slug_locale = realm_locale.name;
              }
            } else if ('name' in response) {
              summary.name_locale = response.name;
              summary.slug_locale = response.name;
            }
          }
          if (key === 'connected_realm' && value && value.href) {
            const connected_realm_id: number = parseInt(value.href.replace(/\D/g, ''));
            if (connected_realm_id && !isNaN(connected_realm_id)) {
              const connected_realm: ConnectedRealmInterface = await this.BNet.query(`/data/wow/connected-realm/${connected_realm_id}`, {
                timeout: 10000,
                params: { locale: 'en_GB' },
                headers: { 'Battlenet-Namespace': 'dynamic-eu' },
              });
              await job.updateProgress(50);
              if (connected_realm) {
                if (connected_realm.id) summary.connected_realm_id = parseInt(connected_realm.id);
                if (connected_realm.has_queue) summary.has_queue = connected_realm.has_queue;
                if (connected_realm.status && connected_realm.status.name) summary.status = connected_realm.status.name;
                if (connected_realm.population && connected_realm.population.name) summary.population_status = connected_realm.population.name;
                if (connected_realm.realms && Array.isArray(connected_realm.realms) && connected_realm.realms.length) {
                  summary.connected_realms = connected_realm.realms.map(({ slug }) => slug);
                }
              }
            }
          }
        })
      );

      Object.assign(realm, summary);

      await realm.save();
      await job.updateProgress(100);
    } catch (errorException) {
      this.logger.error(`${RealmsWorker.name}: ${errorException}`)
    }
  }
}
