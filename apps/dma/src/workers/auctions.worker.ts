import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { auctionsQueue, DMA_TIMEOUT_TOLERANCE, IAuctionsOrder, IAuctionsResponse, IQAuction, round2 } from '@app/core';
import { Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Realm } from '@app/mongo';
import { Job } from 'bullmq';
import moment from 'moment';
import { Model } from 'mongoose';
import { bufferCount, concatMap } from 'rxjs/operators';
import { from, lastValueFrom } from 'rxjs';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';

@BullWorker({ queueName: auctionsQueue.name })
export class AuctionsWorker {
  private readonly logger = new Logger(
    AuctionsWorker.name, { timestamp: true },
  );

  private BNet: BlizzAPI;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Auction.name)
    private readonly AuctionModel: Model<Auction>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
  ) {}

  @BullWorkerProcess(auctionsQueue.workerOptions)
  public async process(job: Job<IQAuction, number>): Promise<number> {
    try {
      const args: IQAuction = { ...job.data };
      await job.updateProgress(5);

      let ifModifiedSince: string = `${moment(0).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;
      let getAuctionsMethodApi: string = '/data/wow/auctions/commodities';

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken
      });
      /**
       * @description If no connected realm passed, then deal with it, as COMMDTY
       * @description Else, it's an auctions request
       */
      if (!args.connected_realm_id) {
        const isModifiedSinceExists = !!(await this.redisService.exists('COMMDTY'));
        if (isModifiedSinceExists) {
          const ifModifiedSinceTimestamp = await this.redisService.get('COMMDTY');

          ifModifiedSince = `${moment(ifModifiedSinceTimestamp).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;
        }
      } else {
        /**
         * @description Check auction timestamp for each realm
         */
        if (!args.auctions || args.auctions === 0) {
          const realm = await this.RealmModel.findOne({ connected_realm_id: args.connected_realm_id }).select('auctions').lean();

          realm ? args.auctions = realm.auctions : args.auctions = 0;

          await job.updateProgress(10);

          ifModifiedSince = `${moment(args.auctions).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;
        }
        getAuctionsMethodApi = `/data/wow/connected-realm/${args.connected_realm_id}/auctions`;
      }

      const auctionsResponse: IAuctionsResponse = await this.BNet.query(getAuctionsMethodApi, {
        timeout: DMA_TIMEOUT_TOLERANCE,
        params: { locale: 'en_GB' },
        headers: {
          'Battlenet-Namespace': 'dynamic-eu',
          'If-Modified-Since': ifModifiedSince
        }
      });

      await job.updateProgress(15);
      if (!auctionsResponse || !Array.isArray(auctionsResponse.auctions) || !auctionsResponse.auctions.length) return 504;

      const ts: number = parseInt(moment(auctionsResponse.lastModified).format('x'));

      const orders = await this.writeBulkOrders(auctionsResponse.auctions, ts, args.connected_realm_id);

      if (args.connected_realm_id) {
        await job.log(`${AuctionsWorker.name}: ${args.connected_realm_id}:${orders}`);
        await job.updateProgress(90);
        await this.RealmModel.updateMany({ connected_realm_id: args.connected_realm_id }, { auctions: ts });
        await job.updateProgress(100);
      } else {
        await job.log(`${AuctionsWorker.name}: COMMDTY:${orders}`);
        await job.updateProgress(90);
        await this.redisService.set('COMMDTY', ts);
        await this.redisService.set(`COMMDTY:TS:${ts}`, ts, 'EX', 86400);
        await job.updateProgress(100);
      }

      return 200
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`${AuctionsWorker.name}: ${errorException}`);
      return 500;
    }
  }

  private transformOrders(orders: IAuctionsOrder[], last_modified: number, connected_realm_id?: number): Auction[] {
    return orders.map(order => {
      if (order.item && order.item.id) {
        order.item_id = order.item.id
        if (order.item.id === 82800) {
          // TODO pet fix
        }
      }
      if (order.bid) order.bid = round2(order.bid / 10000);
      if (order.buyout) order.buyout = round2(order.buyout / 10000);
      if (order.unit_price) order.price = round2(order.unit_price / 10000);
      if (connected_realm_id) order.connected_realm_id = connected_realm_id;
      order.last_modified = last_modified;
      return new this.AuctionModel(order)
    })
  }

  private async writeBulkOrders(orders: IAuctionsOrder[], last_modified: number, connected_realm_id?: number): Promise<number> {
    let iterator: number = 0;
    try {
      await lastValueFrom(
        from(orders).pipe(
          bufferCount(10000),
          concatMap(async (ordersBulk) => {
            const ordersBulkAuctions = this.transformOrders(ordersBulk, last_modified, connected_realm_id);
            await this.AuctionModel.insertMany(ordersBulkAuctions, { rawResult: false, lean: true });
            iterator += ordersBulkAuctions.length;
            this.logger.debug(`writeBulkOrders: ${connected_realm_id}:${iterator}`);
          }),
        )
      );
      return iterator;
    } catch (errorException) {
      this.logger.error(`writeBulkOrders: ${errorException}`);
      return iterator;
    }
  }
}
