import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { auctionsQueue, DMA_TIMEOUT_TOLERANCE, round2 } from '@app/core';
import { Logger } from '@nestjs/common';
import BlizzAPI, { BattleNetOptions } from 'blizzapi';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Realm } from '@app/mongo';
import { Job } from 'bullmq';
import moment from "moment";
import { Model } from "mongoose";
import { bufferCount, concatMap } from 'rxjs/operators';
import { from } from 'rxjs';

@BullWorker({ queueName: auctionsQueue.name })
export class AuctionsWorker {
  private readonly logger = new Logger(
    AuctionsWorker.name, true,
  );

  private BNet: BlizzAPI;

  constructor(
    @InjectModel(Auction.name)
    private readonly AuctionModel: Model<Auction>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
  ) {}

  @BullWorkerProcess(auctionsQueue.workerOptions)
  public async process(job: Job): Promise<number> {
    try {
      const args: { connected_realm_id: number, auctions?: number } & BattleNetOptions = { ...job.data };
      await job.updateProgress(5);

      if (!args.auctions || args.auctions === 0) {
        const realm = await this.RealmModel.findOne({ connected_realm_id: args.connected_realm_id }).select('auctions').lean();
        if (realm) {
          args.auctions = realm.auctions;
        } else {
          args.auctions = 0;
        }
        await job.updateProgress(10);
      }

      const if_modified_since: string = `${moment(args.auctions).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken
      });

      const response: { auctions: Record<string, any>[], lastModified: string } = await this.BNet.query(`/data/wow/connected-realm/${args.connected_realm_id}/auctions`, {
        timeout: DMA_TIMEOUT_TOLERANCE,
        params: { locale: 'en_GB' },
        headers: {
          'Battlenet-Namespace': 'dynamic-eu',
          'If-Modified-Since': if_modified_since
        }
      });

      await job.updateProgress(15);
      if (!response || !Array.isArray(response.auctions) || !response.auctions.length) return 504

      const ts: number = parseInt(moment(response.lastModified).format('x'));

      const orders = await this.writeBulkOrders(response.auctions, args.connected_realm_id, ts);
      await job.log(`${AuctionsWorker.name}: ${args.connected_realm_id}:${orders}`);

      await job.updateProgress(90);
      await this.RealmModel.updateMany({ connected_realm_id: args.connected_realm_id }, { auctions: ts });
      await job.updateProgress(100);
      return 200
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`${AuctionsWorker.name}: ${errorException}`)
      return 500
    }
  }

  private transformOrders(orders: any[], connected_realm_id: number, last_modified: number): Auction[] {
    return orders.map(order => {
      if (order.item && order.item.id) {
        order.item_id = order.item.id
        if (order.item.id === 82800) {
          //TODO pet fix
        }
      }
      if (order.bid) order.bid = round2(order.bid / 10000);
      if (order.buyout) order.buyout = round2(order.buyout / 10000);
      if (order.unit_price) order.price = round2(order.unit_price / 10000);
      order.connected_realm_id = connected_realm_id;
      order.last_modified = last_modified;
      return new this.AuctionModel(order)
    })
  }

  private async writeBulkOrders(orders: any[], connected_realm_id: number, last_modified: number): Promise<number> {
    let iterator: number = 0;
    try {
      await from(orders).pipe(
        bufferCount(10000),
        concatMap(async (ordersBulk) => {
          const ordersBulkAuctions = this.transformOrders(ordersBulk, connected_realm_id, last_modified);
          await this.AuctionModel.insertMany(ordersBulkAuctions, { rawResult: false, lean: true });
          iterator += ordersBulkAuctions.length;
          this.logger.debug(`writeBulkOrders: ${connected_realm_id}:${iterator}`);
        }),
      ).toPromise();
      return iterator;
    } catch (errorException) {
      this.logger.error(`writeBulkOrders: ${errorException}`);
      return iterator;
    }
  }
}
