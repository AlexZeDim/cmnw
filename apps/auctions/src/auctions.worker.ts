import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { auctionsQueue, round2 } from '@app/core';
import { Logger } from '@nestjs/common';
import BlizzAPI, { BattleNetOptions } from 'blizzapi';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import moment from "moment";

@BullWorker({ queueName: auctionsQueue.name })
export class AuctionsWorker {
  private readonly logger = new Logger(
    AuctionsWorker.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Auction.name)
    private readonly AuctionModel: Model<Auction>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
  ) {}

  @BullWorkerProcess({ concurrency: auctionsQueue.concurrency })
  public async process(job: Job): Promise<number> {
    try {
      const args: { connected_realm_id: number, auctions?: number } & BattleNetOptions = { ...job.data };

      if (!args.auctions || args.auctions === 0) {
        const realm = await this.RealmModel.findOne({ connected_realm_id: args.connected_realm_id }).select('auctions').lean();
        if (realm) {
          args.auctions = realm.auctions;
        } else {
          args.auctions = 0;
        }
      }

      const if_modified_since: string = `${moment(args.auctions).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken
      });

      const response: { auctions: Record<string, any>[], lastModified: string } = await this.BNet.query(`/data/wow/connected-realm/${args.connected_realm_id}/auctions`, {
        timeout: 30000,
        params: { locale: 'en_GB' },
        headers: {
          'Battlenet-Namespace': 'dynamic-eu',
          'If-Modified-Since': if_modified_since
        }
      });

      if (!response || !Array.isArray(response.auctions) || !response.auctions.length) return 504

      const ts: number = parseInt(moment(response.lastModified).format('x'));

      const orders: any = await Promise.all(
        response.auctions.map(async order => {
          if (order.item && order.item.id) {
            order.item_id = order.item.id
            if (order.item.id === 82800) {
              //TODO pet fix
            }
          }
          if (order.bid) order.bid = round2(order.bid / 10000);
          if (order.buyout) order.buyout = round2(order.buyout / 10000);
          if (order.unit_price) order.price = round2(order.unit_price / 10000);
          order.connected_realm_id = args.connected_realm_id;
          order.last_modified = ts;
          return order
        })
      )

      await this.AuctionModel.insertMany(orders, { rawResult: false, limit: 10000 });
      await this.RealmModel.updateMany({ connected_realm_id: args.connected_realm_id }, { auctions: ts });
      return 200
    } catch (e) {
      this.logger.error(`${AuctionsWorker.name}: ${e}`)
      return 500
    }
  }
}
