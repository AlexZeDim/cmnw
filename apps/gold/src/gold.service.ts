import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Gold, Realm } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FACTION, FunPayGoldInterface } from '@app/core';
import cheerio from 'cheerio';
import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class GoldService {
  private readonly logger = new Logger(
    GoldService.name, { timestamp: true },
  );

  constructor(
    private httpService: HttpService,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Gold.name)
    private readonly GoldModel: Model<Gold>,
  ) { }

  @Cron(CronExpression.EVERY_HOUR)
  private async indexGold(): Promise<void> {
    try {
      const response = await this.httpService.get('https://funpay.ru/chips/2/').toPromise();

      const funPayHTML = cheerio.load(response.data);
      const listingHTML = funPayHTML
        .html('a.tc-item');

      const listing: Partial<FunPayGoldInterface>[] = [];
      const orders: Gold[] = [];
      const realms: Set<number> = new Set<number>();
      const now: number = new Date().getTime();

      funPayHTML(listingHTML).map((_x, node) => {
        const realm = funPayHTML(node).find('.tc-server').text();
        const faction = funPayHTML(node).find('.tc-side').text();
        const status = !!funPayHTML(node).attr('data-online');
        const quantity = funPayHTML(node).find('.tc-amount').text();
        const owner = funPayHTML(node).find('.media-user-name').text();
        const price = funPayHTML(node).find('.tc-price div').text();
        listing.push({ realm, faction, status, quantity, owner, price });
      });

      await from(listing).pipe(
        mergeMap(async (order) => {
          try {
            const realm: LeanDocument<Realm> = await this.RealmModel
              .findOne({ $text: { $search: order.realm } })
              .select('connected_realm_id')
              .lean();

            if (realm?.connected_realm_id && order?.price && order?.quantity) {
              const
                price: number = parseFloat(order.price.replace(/ ₽/g, '')),
                quantity: number = parseInt(order.quantity.replace(/\s/g, ''));

              let faction: FACTION = FACTION.ANY;

              if (order.faction === FACTION.A || order.faction === 'Альянс') faction = FACTION.A;
              if (order.faction === FACTION.H || order.faction === 'Орда') faction = FACTION.H;

              if (quantity < 15000000) {
                const gold = new this.GoldModel({
                  connected_realm_id: realm.connected_realm_id,
                  faction: faction,
                  quantity: quantity,
                  status: order.status ? 'Online' : 'Offline',
                  owner: order.owner,
                  price: price,
                  last_modified: now,
                });
                realms.add(realm.connected_realm_id);
                orders.push(gold);
              } else {
                this.logger.log(`indexGold: order quantity: ${quantity} found`);
              }
            }
          } catch (error) {
            this.logger.error(`indexGold: error ${error}`);
          }
        }, 5)
      ).toPromise();

      if (!orders.length) {
        this.logger.warn(`indexGold: ${orders.length} found`);
        return;
      }

      await this.GoldModel.insertMany(orders, { rawResult: false });
      await this.RealmModel.updateMany({ connected_realm_id: { $in: Array.from(realms) } }, { golds: now });
      this.logger.log(`indexGold: ${orders.length} orders on timestamp: ${now} successfully inserted`);
    } catch (errorException) {
      this.logger.error(`indexGold: ${errorException}`)
    }
  }
}
