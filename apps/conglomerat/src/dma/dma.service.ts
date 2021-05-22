import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ItemCrossRealmDto } from './dto/itemCrossRealmDto';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Gold, Item, Realm } from '@app/mongo';
import { LeanDocument, Model, Query } from 'mongoose';
import { VALUATION_TYPE } from '@app/core';

@Injectable()
export class DmaService {
  private readonly logger = new Logger(
    DmaService.name, true,
  );

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Item.name)
    private readonly ItemModel: Model<Item>,
    @InjectModel(Gold.name)
    private readonly GoldModel: Model<Gold>,
    @InjectModel(Auction.name)
    private readonly AuctionModel: Model<Auction>,
  ) { }

  async getItem(input: ItemCrossRealmDto) {
    const [ item ] = input._id.split('@');
    if (item) {
      if (isNaN(Number(item))) {
        return this.ItemModel
          .findOne(
            { $text: { $search: item } },
            { score: { $meta: 'textScore' } },
          )
          .sort({ score: { $meta: 'textScore' } })
          .lean();
      } else {
        return this.ItemModel
          .findById(parseInt(item))
          .lean();
      }
    }
  }

  async getItemValuations(input: ItemCrossRealmDto): Promise<string> {
    const { item , realm } = await this.validateTransformDmaQuery(input._id);
    if (!item || !realm || !realm.length) {
      throw new BadRequestException('Test')
    }

    const connected_realms_id = [...new Set(realm.map(({ connected_realm_id }) => connected_realm_id))];
    const is_commdty = item.asset_class.includes(VALUATION_TYPE.COMMDTY) || (item.stackable && item.stackable > 1);
    const is_gold = item._id === 1;
    const is_xrs = connected_realms_id.length > 1;

    // TODO valuations of item from table

    return `${input._id}`
  }

  async getItemChart(input: ItemCrossRealmDto) {
    const { item , realm } = await this.validateTransformDmaQuery(input._id);
    if (!item || !realm || !realm.length) {
      throw new BadRequestException('Test')
    }

    const connected_realms_id = [...new Set(realm.map(({ connected_realm_id }) => connected_realm_id))];
    const is_commdty = item.asset_class.includes(VALUATION_TYPE.COMMDTY) || (item.stackable && item.stackable > 1);
    const is_gold = item._id === 1;
    const is_xrs = connected_realms_id.length > 1;

    if (is_commdty) {
      if (is_xrs) {
        if (is_gold) {

        }

      }

    }

    // TODO valuations of item from table

    return `${input._id}`
  }

  priceRange(
    quotes: number[],
    blocks: number,
  ): number[] {
    if (!quotes.length) return [];
    const length = quotes.length > 3 ? quotes.length - 3 : quotes.length;
    const start = length === 1 ? 0 : 1;

    const cap = Math.round(quotes[Math.floor(length * 0.9)]);
    const floor = Math.round(quotes[start]);
    const price_range = cap - floor;
    /** Step represent 2.5% for each cluster */
    const tick = price_range / blocks;
    return Array(Math.ceil((cap + tick - floor) / tick))
      .fill(floor)
      .map((x, y) => parseFloat((x + y * tick).toFixed(4)));
  }

  async buildYAxis(
    item_id: number,
    connected_realms_id: number[],
    is_commdty: boolean = false,
    is_xrs: boolean = false,
    is_gold: boolean = false
  ): Promise<number[]> {
    /**
     * Control price level
     * if XRS => 40
     * else => 20
     */
    const blocks: number = is_xrs ? 40 : 20;
    /** Request oldest from latest timestamp */
    if (is_gold && is_xrs) {
      const { golds } = await this.RealmModel.findOne({ connected_realm_id: { $in: connected_realms_id } }).lean().select('golds').sort({ 'golds': 1 });
      const quotes: number[] = await this.GoldModel.find({ last_modified: { $gte: golds }, connected_realm_id: { $in: connected_realms_id } }, 'price').distinct('price');
      return this.priceRange(quotes, blocks);
    }

    if (is_gold && !is_xrs) {
      const quotes: number[] = await this.GoldModel.find({ connected_realm_id: { $in: connected_realms_id } }, 'price').distinct('price');
      return this.priceRange(quotes, blocks);
    }

    if (!is_gold && is_xrs) {
      const { auctions } = await this.RealmModel.findOne({ connected_realm_id: { $in: connected_realms_id } }).lean().select('auctions').sort({ 'auctions': 1 });
      /** Find distinct prices for each realm */
      const quotes: number[] = await this.AuctionModel.find({ last_modified: { $gte: auctions }, 'item.id': item_id, connected_realm_id: { $in: connected_realms_id } }, 'unit_price').distinct('unit_price');
      return this.priceRange(quotes, blocks);
    }

    if (!is_gold && !is_xrs) {
      /** Find distinct prices for each realm */
      const quotes = await this.AuctionModel.find({ 'item.id': item_id, connected_realm_id: { $in: connected_realms_id } }, 'unit_price').hint({ 'item.id': -1, connected_realm_id: 1 }).distinct('unit_price');
      return this.priceRange(quotes, blocks);
    }

    return []
  }

  async goldXRS(yAxis: number[], realm: LeanDocument<Realm>) {
    const chart = [];
    if (!y_axis.length) return chart
  }

  getItemQuotes(item: string, realm: string): string {
    // TODO add new dma to queue
    return `${item}@${realm}`
  }

  getItemFeed(item: string, realm: string): string {
    // TODO add new dma to queue
    return `${item}@${realm}`
  }

  async validateTransformDmaQuery(input: string) {
    let
      item: LeanDocument<Item>,
      realm: LeanDocument<Realm>[];

    const [ queryItem, queryRealm ] = input.split('@');
    const realmArrayString = queryRealm
      .split(';')
      .filter(value => value !== '');

    if (queryItem) {
      if (isNaN(Number(queryItem))) {
        item = await this.ItemModel
          .findOne(
            { $text: { $search: queryItem } },
            { score: { $meta: 'textScore' } },
          )
          .sort({ score: { $meta: 'textScore' } })
          .lean();
      } else {
        item = await this.ItemModel
          .findById(parseInt(queryItem))
          .lean();
      }
    }

    if (realmArrayString.length === 1) {
      if (isNaN(Number(queryRealm))) {
        /** if string */
        realm = await this.RealmModel
          .find(
            { $text: { $search: queryRealm } },
            { score: { $meta: 'textScore' } },
          )
          .sort({ score: { $meta: 'textScore' } })
          .limit(1)
          .lean();
      } else {
        /** if number */
        realm = await this.RealmModel
          .find({ connected_realm_id: parseInt(queryRealm) })
          .limit(1)
          .lean()
      }
    } else {
      const realms = realmArrayString.toString().replace(';', ' ');
      realm = await this.RealmModel
        .find(
          { $text: { $search: realms } },
          { score: { $meta: 'textScore' } },
        )
        .sort({ score: { $meta: 'textScore' } })
        .lean()
    }

    return { item, realm };
  }

  getWowToken(region: string, limit: number): string {
    return `${region}@${limit}`
  }
}
