import { BadRequestException, Injectable } from '@nestjs/common';
import { GetItemDto, ItemChartDto, ItemCrossRealmDto, ItemFeedDto, ItemQuotesDto, WowtokenDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Gold, Item, Realm, Token, Valuations } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import {
  ChartOrderInterface,
  IVQInterface,
  OrderQuotesInterface,
  OrderXrsInterface,
  RealmAInterface,
  VALUATION_TYPE,
  valuationsQueue,
} from '@app/core';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { ItemValuationsDto } from './dto/item-valuations.dto';

@Injectable()
export class DmaService {

  constructor(
    @InjectModel(Token.name)
    private readonly TokenModel: Model<Token>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Item.name)
    private readonly ItemModel: Model<Item>,
    @InjectModel(Gold.name)
    private readonly GoldModel: Model<Gold>,
    @InjectModel(Auction.name)
    private readonly AuctionModel: Model<Auction>,
    @InjectModel(Valuations.name)
    private readonly ValuationsModel: Model<Valuations>,
    @BullQueueInject(valuationsQueue.name)
    private readonly queueValuations: Queue<IVQInterface, number>,
  ) { }

  async getItem(input: ItemCrossRealmDto): Promise<GetItemDto> {
    return await this.validateTransformDmaQuery(input._id);
  }

  async getItemValuations(input: ItemCrossRealmDto): Promise<ItemValuationsDto> {
    const { item , realm } = await this.validateTransformDmaQuery(input._id);
    if (!item || !realm || !realm.length) {
      throw new BadRequestException('Please provide correct item@realm;realm;realm in your query');
    }

    let is_gold = false;

    if (item._id === 1 || item.asset_class.includes(VALUATION_TYPE.WOWTOKEN)) is_gold = true;

    let is_evaluating: number = 0;

    if (item.asset_class.length === 0) {
      throw new BadRequestException('Required item cannot be evaluated');
    }

    const valuations: LeanDocument<Valuations>[] = [];

    await Promise.all(
      realm.map(
        async (connected_realm: RealmAInterface) => {
          const timestamp = is_gold ? connected_realm.golds : connected_realm.auctions;

          const item_valuations = await this.ValuationsModel
            .find({
              item_id: item.asset_class.includes(VALUATION_TYPE.WOWTOKEN) ? { $in: [122284, 122270] } : item._id,
              last_modified: timestamp,
              connected_realm_id: connected_realm._id
            })
            .lean();

          if (item_valuations.length > 0) {
            valuations.push(...item_valuations);
          } else {
            const _id = `${item._id}@${connected_realm._id}:${timestamp}`;
            await this.queueValuations.add(
              _id,{
                _id: item._id,
                last_modified: timestamp,
                connected_realm_id: connected_realm._id,
                iteration: 0
              }, {
                jobId: _id,
                priority: 1,
              }
            );
            is_evaluating = is_evaluating + 1;
          }
        }
      )
    );

    return { valuations, is_evaluating };
  }

  async getItemChart(input: ItemCrossRealmDto): Promise<ItemChartDto> {
    const { item, realm } = await this.validateTransformDmaQuery(input._id);
    if (!item || !realm || !realm.length) {
      throw new BadRequestException('Please provide correct item@realm;realm;realm in your query');
    }

    const is_commdty = item.asset_class.includes(VALUATION_TYPE.COMMDTY) || (item.stackable && item.stackable > 1);
    const is_gold = item._id === 1;
    const is_xrs = realm.length > 1;

    const connected_realms_id = realm.map(connected_realm => connected_realm._id);
    const yAxis = await this.buildYAxis(item._id, connected_realms_id, is_commdty, is_xrs, is_gold);
    const xAxis: (string | number | Date)[] = [];
    const dataset: ChartOrderInterface[] = [];

    await Promise.all(
      realm.map(async(connected_realm: RealmAInterface, i: number) => {
        if (is_commdty) {
          if (is_xrs) {
            /** Build X axis */
            xAxis[i] = connected_realm.realms.join(', ');
            /** Build Cluster from Orders */
            if (is_gold) {
              const orderDataset = await this.goldXRS(yAxis, connected_realm.connected_realm_id, connected_realm.golds, i);
              if (orderDataset && orderDataset.length) {
                dataset.push(...orderDataset);
              }
            }

            if (!is_gold) {
              const orderDataset = await this.commdtyXRS(yAxis, item._id, connected_realm.connected_realm_id, connected_realm.auctions, i);
              if (orderDataset && orderDataset.length) {
                dataset.push(...orderDataset);
              }
            }
          }

          if (!is_xrs) {
            /** Build Cluster by Timestamp */
            if (is_gold) {
              const { chart, timestamps } = await this.goldIntraDay(yAxis, connected_realm.connected_realm_id);
              if (chart && timestamps) {
                dataset.push(...chart);
                xAxis.push(...timestamps);
              }
            }

            if (!is_gold) {
              const { chart, timestamps } = await this.commdtyIntraDay(yAxis, item._id, connected_realm.connected_realm_id);
              if (chart && timestamps) {
                dataset.push(...chart);
                xAxis.push(...timestamps);
              }
            }
          }
        }
      })
    );

    return { yAxis, xAxis, dataset };
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
      const quotes: number[] = await this.AuctionModel
        .find({ connected_realm_id: { $in: connected_realms_id }, 'item.id': item_id, last_modified: { $gte: auctions }, }, 'price')
        .hint({ 'connected_realm_id': -1, 'last_modified': -1, 'item_id': -1 })
        .distinct('price');
      return this.priceRange(quotes, blocks);
    }

    if (!is_gold && !is_xrs) {
      /** Find distinct prices for one */
      const quotes = await this.AuctionModel
        .find({ connected_realm_id: { $in: connected_realms_id }, 'item.id': item_id }, 'price')
        .hint({ 'connected_realm_id': -1, 'item_id': -1, 'last_modified': -1, })
        .distinct('price');
      return this.priceRange(quotes, blocks);
    }

    return [];
  }

  async goldXRS(
    yAxis: number[],
    connected_realm_id: number,
    golds: number,
    xIndex: number
  ): Promise<ChartOrderInterface[]> {
    if (!yAxis.length) return [];

    const orders: OrderXrsInterface[] = await this.GoldModel
      .aggregate<OrderXrsInterface>([
        {
          $match: {
            status: 'Online',
            connected_realm_id: connected_realm_id,
            last_modified: { $eq: golds },
          },
        },
        {
          $bucket: {
            groupBy: '$price',
            boundaries: yAxis,
            default: 'Other',
            output: {
              orders: { $sum: 1 },
              value: { $sum: '$quantity' },
              price: { $first: '$price' },
              oi: {
                $sum: { $multiply: ['$price', { $divide: [ '$quantity', 1000 ] }] },
              }
            }
          }
        },
      ])
      .allowDiskUse(true);

    return this.buildDataset(yAxis, orders, xIndex);
  }

  async commdtyXRS(
    yAxis: number[],
    item_id: number,
    connected_realm_id: number,
    auctions: number,
    xIndex: number
  ): Promise<ChartOrderInterface[]> {
    if (!yAxis.length) return [];

    const orders: OrderXrsInterface[] = await this.AuctionModel
      .aggregate<OrderXrsInterface>([
        {
          $match: {
            connected_realm_id: connected_realm_id,
            'item.id': item_id,
            last_modified: { $eq: auctions },
          },
        },
        {
          $bucket: {
            groupBy: "$price",
            boundaries: yAxis,
            default: "Other",
            output: {
              orders: { $sum: 1 },
              value: { $sum: "$quantity" },
              price: { $first: '$price' },
              oi: {
                $sum: { $multiply: ['$price', '$quantity'] },
              }
            }
          }
        },
      ])
      .allowDiskUse(true);

    return this.buildDataset(yAxis, orders, xIndex);
  }

  async goldIntraDay(yAxis: number[], connected_realm_id: number) {
    const chart: ChartOrderInterface[] = [];
    if (!yAxis.length) return { chart };
    if (!connected_realm_id) return { chart };
    /** Find distinct timestamps for each realm */
    const timestamps: number[] = await this.GoldModel
      .find({ connected_realm_id: connected_realm_id }, 'last_modified')
      .distinct('last_modified');

    timestamps.sort((a, b) => a - b);

    await Promise.all(timestamps.map(
      async (timestamp, i) => {
        await this.GoldModel
          .aggregate([
            {
              $match: {
                status: 'Online',
                connected_realm_id: connected_realm_id,
                last_modified: timestamp
              }
            },
            {
              $bucket: {
                groupBy: '$price',
                boundaries: yAxis,
                default: 'Other',
                output: {
                  orders: { $sum: 1 },
                  value: { $sum: '$quantity' },
                  price: { $first: '$price' },
                  oi: {
                    $sum: { $multiply: ['$price', { $divide: [ '$quantity', 1000 ] } ] },
                  }
                }
              }
            },
            {
              $addFields: { xIndex: i }
            }
          ])
          .allowDiskUse(true)
          .cursor()
          .exec()
          .eachAsync((order: OrderXrsInterface) => {
            console.log(order);
            const yIndex = yAxis.findIndex((pQ) => pQ === order._id)
            if (yIndex !== -1) {
              chart.push({
                x:  order.xIndex,
                y: yIndex,
                orders: order.orders,
                value: order.value,
                oi: parseInt(order.oi.toFixed(0), 10)
              });
            } else if (order._id === 'Other') {
              if (order.price > yAxis[yAxis.length-1]) {
                chart.push({
                  x: order.xIndex,
                  y: yAxis.length-1,
                  orders: order.orders,
                  value: order.value,
                  oi: parseInt(order.oi.toFixed(0), 10)
                });
              } else {
                chart.push({
                  x: order.xIndex,
                  y: 0,
                  orders: order.orders,
                  value: order.value,
                  oi: parseInt(order.oi.toFixed(0), 10)
                });
              }
            }
          }, { parallel: 20 });
      })
    );

    return { chart, timestamps };
  }

  async commdtyIntraDay(yAxis: number[], item_id: number, connected_realm_id: number) {
    const chart: ChartOrderInterface[] = [];
    if (!yAxis.length) return { chart };
    if (!connected_realm_id) return { chart };
    /** Find distinct timestamps for each realm */
    const timestamps: number[] = await this.AuctionModel
      .find({ connected_realm_id: connected_realm_id, 'item.id': item_id }, 'last_modified')
      .distinct('last_modified');

    timestamps.sort((a, b) => a - b);

    await Promise.all(
      timestamps.map(
        async (timestamp, i) => {
          await this.AuctionModel
            .aggregate([
              {
                $match: {
                  connected_realm_id: connected_realm_id,
                  'item.id': item_id,
                  last_modified: timestamp,
                }
              },
              {
                $bucket: {
                  groupBy: '$price',
                  boundaries: yAxis,
                  default: 'Other',
                  output: {
                    orders: { $sum: 1 },
                    value: { $sum: '$quantity' },
                    price: { $first: '$price' },
                    oi: { $sum: { $multiply: ['$price', '$quantity'] } }
                  }
                }
              },
              {
                $addFields: {
                  xIndex: i,
                  oi: { $trunc: ['$oi', 2] }
                }
              }
            ])
            .allowDiskUse(true)
            .cursor()
            .exec()
            .eachAsync((order: OrderXrsInterface) => {
              const yIndex = yAxis.findIndex((pQ) => pQ === order._id)
              if (yIndex !== -1) {
                chart.push({
                  x: order.xIndex,
                  y: yIndex,
                  orders: order.orders,
                  value: order.value,
                  oi: order.oi
                })
              } else if (order._id === 'Other') {
                if (order.price > yAxis[yAxis.length-1]) {
                  chart.push({
                    x: order.xIndex,
                    y: yAxis.length-1,
                    orders: order.orders,
                    value: order.value,
                    oi: order.oi
                  });
                } else {
                  chart.push({
                    x: order.xIndex,
                    y: 0,
                    orders: order.orders,
                    value: order.value,
                    oi: order.oi
                  });
                }
              }
            }, { parallel: 20 });
        }
      )
    );

    return { chart, timestamps };
  }

  buildDataset(yAxis: number[], orders: OrderXrsInterface[], xIndex: number): ChartOrderInterface[] {
    return orders.map(order => {
      const yIndex = yAxis.findIndex((pQ) => pQ === order._id);
      if (yIndex !== -1) {
        return {
          x: xIndex,
          y: yIndex,
          orders: order.orders,
          value: order.value,
          oi: parseInt(order.oi.toFixed(0), 10)
        };
      } else if (order._id === 'Other') {
        if (order.price > yAxis[yAxis.length-1]) {
          return {
            x: xIndex,
            y: yAxis.length-1,
            orders: order.orders,
            value: order.value,
            oi: parseInt(order.oi.toFixed(0), 10)
          };
        } else {
          return {
            x: xIndex,
            y: 0,
            orders: order.orders,
            value: order.value,
            oi: parseInt(order.oi.toFixed(0), 10)
          };
        }
      }
    })
  }


  async getItemQuotes(input: ItemCrossRealmDto): Promise<ItemQuotesDto> {
    const { item , realm } = await this.validateTransformDmaQuery(input._id);
    if (!item || !realm || !realm.length) {
      throw new BadRequestException('Please provide correct item@realm;realm;realm in your query')
    }

    const is_xrs = realm.length > 1;
    const is_gold = item._id === 1;

    const quotes: OrderQuotesInterface[] = [];

    await Promise.all(
      realm.map(
        async (connected_realm) => {
          if (!is_xrs) {
            /** NOT XRS && NOT GOLD */
            if (!is_gold) {
              const orderQuotes: OrderQuotesInterface[] = await this.AuctionModel.aggregate([
                {
                  $match: {
                    connected_realm_id: connected_realm._id,
                    'item.id': item._id,
                    last_modified: connected_realm.auctions,
                  },
                },
                {
                  $project: {
                    id: '$id',
                    quantity: '$quantity',
                    price: {
                      $ifNull: ['$buyout', { $ifNull: ['$bid', '$price'] }],
                    },
                  },
                },
                {
                  $group: {
                    _id: '$price',
                    quantity: { $sum: '$quantity' },
                    open_interest: { $sum: { $multiply: ['$price', '$quantity'] } },
                    orders: { $addToSet: '$id' },
                  },
                },
                {
                  $sort: { _id: 1 },
                },
                {
                  $project: {
                    _id: 0,
                    price: '$_id',
                    quantity: '$quantity',
                    open_interest: { $trunc: ['$open_interest', 2] },
                    size: {
                      $cond: {
                        if: { $isArray: '$orders' },
                        then: { $size: '$orders' },
                        else: 0,
                      },
                    },
                  },
                },
              ]);
              // TODO possible eachAsync cursor
              quotes.push(...orderQuotes);
            }
            /** NOT XRS but GOLD */
            if (is_gold) {
              const orderQuotes: OrderQuotesInterface[] = await this.GoldModel.aggregate([
                {
                  $match: {
                    status: 'Online',
                    connected_realm_id: connected_realm._id,
                    last_modified: connected_realm.golds,
                  },
                },
                {
                  $project: {
                    id: '$id',
                    quantity: '$quantity',
                    price: '$price',
                    owner: '$owner',
                  },
                },
                {
                  $group: {
                    _id: '$price',
                    quantity: { $sum: '$quantity' },
                    open_interest: {
                      $sum: {
                        $multiply: ['$price', { $divide: ['$quantity', 1000] }],
                      },
                    },
                    sellers: { $addToSet: '$owner' },
                  },
                },
                {
                  $sort: { _id: 1 },
                },
                {
                  $project: {
                    _id: 0,
                    price: '$_id',
                    quantity: '$quantity',
                    open_interest: { $trunc: ['$open_interest', 2] },
                    size: {
                      $cond: {
                        if: { $isArray: '$sellers' },
                        then: { $size: '$sellers' },
                        else: 0,
                      },
                    },
                  },
                },
              ]);
              // TODO possible eachAsync cursor
              quotes.push(...orderQuotes);
            }
          }
        }
      )
    );
    return { quotes };
  }

  async getItemFeed(input: ItemCrossRealmDto): Promise<ItemFeedDto> {
    const { item , realm } = await this.validateTransformDmaQuery(input._id);
    if (!item || !realm || !realm.length) {
      throw new BadRequestException('Please provide correct item@realm;realm;realm in your query')
    }
    /**
     * Item should be not commodity
     */
    const is_commdty = item.asset_class.includes(VALUATION_TYPE.COMMDTY) || (item.stackable && item.stackable > 1);

    const feed: LeanDocument<Auction>[] = [];

    if (!is_commdty) {
      await Promise.all(
        realm.map(
          async (connected_realm) => {
            const orderFeed = await this.AuctionModel.find({
              connected_realm_id: connected_realm._id,
              'item.id': item._id,
              last_modified: connected_realm.auctions,
            }).lean();
            // TODO possible eachAsync cursor;
            feed.push(...orderFeed);
          }
        )
      );
    }

    return { feed };
  }

  async validateTransformDmaQuery(input: string) {
    let
      item: LeanDocument<Item>,
      realm: RealmAInterface[];

    const [ queryItem, queryRealm ] = input.split('@');
    const realmArrayString = queryRealm
      .split(';')
      .filter(Boolean);

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

    const projectStage = { $addFields: { score: { $meta: "textScore" } } };
    const sortStage = { $sort: { score: { $meta: "textScore" } } };
    const groupStage = {
      $group: {
        _id: '$connected_realm_id',
        realms: { $addToSet: '$name_locale' },
        connected_realm_id: { $first: '$connected_realm_id' },
        slug: { $first: '$slug' },
        auctions: { $first: '$auctions' },
        golds: { $first: '$golds' },
        valuations: { $first: '$valuations' }
      }
    };
    const limitStage = { $limit: 1 };

    if (realmArrayString.length === 1) {
      if (isNaN(Number(queryRealm))) {
        /** if string */
        realm = await this.RealmModel
          .aggregate<RealmAInterface>([
            { $match: { $text: { $search: queryRealm } } },
            projectStage,
            sortStage,
            groupStage,
            limitStage
          ]);
      } else {
        /** if number */
        realm = await this.RealmModel
          .aggregate<RealmAInterface>([
            { $match: { connected_realm_id: parseInt(queryRealm) } },
            projectStage,
            sortStage,
            groupStage,
            limitStage
          ]);
      }
    } else {
      const queryRealms = realmArrayString.toString().replace(';', ' ');
      realm = await this.RealmModel
        .aggregate<RealmAInterface>([
          { $match: { $text: { $search: queryRealms } } },
          projectStage,
          sortStage,
          groupStage
        ]);
    }

    return { item, realm };
  }

  async getWowToken(input: WowtokenDto): Promise<LeanDocument<Token>[]> {
    return this.TokenModel.find({
      region: input.region || 'eu',
    })
      .limit(input.limit ? input.limit : 1)
      .sort({ _id: -1 })
      .lean();
  }
}
