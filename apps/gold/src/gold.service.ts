import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Gold, Realm } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import Xray from 'x-ray';

@Injectable()
export class GoldService {
  private readonly logger = new Logger(
    GoldService.name, true,
  );

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Gold.name)
    private readonly GoldModel: Model<Gold>,
  ) {
    this.indexGold()
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async indexGold(): Promise<void> {
    try {
      const
        now: number = new Date().getTime(),
        realms: Set<number> = new Set<number>(),
        x = Xray(),
        orders: Gold[] = [];

      const listing = await x('https://funpay.ru/chips/2/', '.tc-item', [
        {
          realm: '.tc-server', //@data-server num
          faction: '.tc-side', //@data-side 0/1
          status: '@data-online',
          quantity: '.tc-amount',
          owner: '.media-user-name',
          price: '.tc-price div',
        },
      ]).then(res => res);

      if (!listing || !Array.isArray(listing) || !listing.length) return;

      await Promise.all(
        listing.map(async order => {
          const realm: LeanDocument<Realm> = await this.RealmModel
            .findOne({ $text: { $search: order.realm } })
            .select('connected_realm_id')
            .lean();

          if (realm?.connected_realm_id && order?.price && order?.quantity) {
            const
              price: number = parseFloat(order.price.replace(/ ₽/g, '')),
              quantity: number = parseInt(order.quantity.replace(/\s/g, ''));

            if (quantity < 15000000) {
              realms.add(realm.connected_realm_id)
              orders.push(
                new this.GoldModel({
                  connected_realm_id: realm.connected_realm_id,
                  faction: order.faction,
                  quantity: quantity,
                  status: order.status ? 'Online' : 'Offline',
                  owner: order.owner,
                  price: price,
                  last_modified: now,
                })
              )
            } else {
              this.logger.log(`indexGold: order quantity: ${quantity} found`);
            }
          }
        })
      )

      if (!orders.length) {
        this.logger.warn(`indexGold: ${orders.length} found`);
        return;
      }

      await this.GoldModel.insertMany(orders, { rawResult: false });
      await this.RealmModel.updateMany({ 'connected_realm_id': { '$in': Array.from(realms) } }, { golds: now });
      this.logger.log(`indexGold: ${orders.length} orders on timestamp: ${now} successfully inserted`);
    } catch (e) {
      this.logger.error(`indexGold: ${e}`)
    }
  }
}
