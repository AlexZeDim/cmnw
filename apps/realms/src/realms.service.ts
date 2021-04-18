import { Injectable, Logger } from '@nestjs/common';
import { range } from 'lodash';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import Xray from 'x-ray';
import { GLOBAL_KEY, realmsQueue } from '@app/core';
import BlizzAPI from 'blizzapi';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RealmsService {
  private readonly logger = new Logger(
    RealmsService.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(realmsQueue.name)
    private readonly queue: Queue,
  ) {
    this.indexRealms(GLOBAL_KEY);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexRealms(clearance: string): Promise<void> {
    try {
      const idsWCL = await this.getRealmsWarcraftLogsID(247, 517);

      const key = await this.KeyModel.findOne({ tags: clearance });
      if (!key || !key.token) return

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token
      });

      const { realms: realmList } = await this.BNet.query(`/data/wow/realm/index`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      });

      for (const { id, name, slug } of realmList) {
        this.logger.log(`${id}:${name}`)
        await this.queue.add(slug, {
          _id: id,
          name: name,
          slug: slug,
          region: 'eu',
          clientId: key._id,
          clientSecret: key.secret,
          accessToken: key.token,
          population: true,
          wcl_ids: idsWCL
        })
      }
    } catch (e) {
      this.logger.error(`indexRealms: ${e}`)
    }
  }

  /**
   * Index every realm for WCL id, US:0,246 EU:247,517 (RU: 492) Korea: 517
   * @param start
   * @param end
   */
  async getRealmsWarcraftLogsID(start: number = 1, end: number = 517): Promise<{ name: string, id: number }[]> {
    const
      wcl: { name: string, id: number }[] = [],
      x = Xray();

    try {
      if (start < 1) start = 1;
      const wcl_ids: number[] = range(start, end + 1, 1);
      for (const wcl_id of wcl_ids) {
        const realm_name: string = await x(`https://www.warcraftlogs.com/server/id/${wcl_id}`, '.server-name').then(res => res);
        if (realm_name) {
          this.logger.debug(`${wcl_id}:${realm_name}`)
          wcl.push({ name: realm_name, id: wcl_id });
        }
      }
      return wcl
    } catch (e) {
      this.logger.error(`getRealmsWarcraftLogsID: ${e}`)
      return wcl;
    }
  }
}
