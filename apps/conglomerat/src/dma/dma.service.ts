import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ItemChartDto,
  ItemCrossRealmDto,
  ItemFeedDto,
  ItemQuotesDto,
  WowtokenDto,
  ItemValuationsDto,
  ReqGetItemDto,
  IBuildYAxis,
  IGetCommdtyOrders,
} from '@app/core';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Gold, Item, Realm, Token, Valuations } from '@app/mongo';
import { Aggregate, FilterQuery, Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import {
  IChartOrder,
  IQItemValuation,
  IOrderQuotes,
  IOrderXrs,
  IARealm,
  VALUATION_TYPE,
  valuationsQueue,
} from '@app/core';

@Injectable()
export class DmaService {
  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
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
    private readonly queueValuations: Queue<IQItemValuation, number>,
  ) {}

  async getItem(input: ReqGetItemDto): Promise<LeanDocument<Item>> {
    if (isNaN(Number(input._id))) {
      return this.ItemModel.findOne(
        { $text: { $search: input._id } },
        { score: { $meta: 'textScore' } },
      )
        .sort({ score: { $meta: 'textScore' } })
        .lean();
    } else {
      return this.ItemModel.findById(parseInt(input._id)).lean();
    }
  }

  async getItemValuations(input: ItemCrossRealmDto): Promise<ItemValuationsDto> {
    const { item, realm } = await this.validateTransformDmaQuery(input._id);
    if (!item || !realm || !realm.length) {
      throw new BadRequestException(
        'Please provide correct item@realm;realm;realm in your query',
      );
    }

    let isGold = false;

    if (item._id === 1 || item.asset_class.includes(VALUATION_TYPE.WOWTOKEN))
      isGold = true;

    let isEvaluating = 0;

    if (item.asset_class.length === 0) {
      throw new BadRequestException('Required item cannot be evaluated');
    }

    const valuations: LeanDocument<Valuations>[] = [];

    await lastValueFrom(
      from(realm).pipe(
        mergeMap(async (connectedRealm: IARealm) => {
          const timestamp = isGold ? connectedRealm.golds : connectedRealm.auctions;

          const itemValuations = await this.ValuationsModel.find({
            item_id: item.asset_class.includes(VALUATION_TYPE.WOWTOKEN)
              ? { $in: [122284, 122270] }
              : item._id,
            last_modified: timestamp,
            connected_realm_id: connectedRealm._id,
          }).lean();

          if (itemValuations.length > 0) {
            valuations.push(...itemValuations);
          } else {
            const jobId = `${item._id}@${connectedRealm._id}:${timestamp}`;
            await this.queueValuations.add(
              jobId,
              {
                _id: item._id,
                last_modified: timestamp,
                connected_realm_id: connectedRealm._id,
                iteration: 0,
              },
              {
                jobId,
                priority: 1,
              },
            );
            isEvaluating = isEvaluating + 1;
          }
        }),
      ),
    );

    return { valuations, is_evaluating: isEvaluating };
  }

  // TODO dto for input
  async getCommdtyChart(input: ReqGetItemDto): Promise<ItemChartDto> {
    const { item } = await this.validateTransformDmaQuery(input._id);
    if (!item) {
      throw new BadRequestException('Please provide correct item');
    }
    /**
     * @description Receive available timestamp for COMMDTY items
     */
    const commdtyTimestampKeys = await this.redisService.keys('COMMDTY:TS:*');
    const commdtyTimestamp = await this.redisService.mget(commdtyTimestampKeys);

    const latestTimestamp = commdtyTimestamp.pop();

    const redisItemKey = `COMMDTY:CHART:${item.id}:${latestTimestamp}`;

    const itemChartDto = await this.redisService.get(redisItemKey);
    if (itemChartDto) {
      return JSON.parse(itemChartDto) as ItemChartDto;
    }

    const yAxis = await this.buildYAxis({
      itemId: item.id,
      isCommdty: true,
      isXrs: true,
      isGold: false,
    });
    /**
     * @description Convert timestamps to numbers and sort in from old to new
     */
    const xAxis = commdtyTimestamp.map((t) => Number(t)).sort((a, b) => a - b);

    const { dataset } = await this.buildCommdtyChart(yAxis, xAxis, item.id);

    await this.redisService.set(
      redisItemKey,
      JSON.stringify({ yAxis, xAxis, dataset }),
      'EX',
      3600,
    );

    return { yAxis, xAxis, dataset };
  }

  async getGoldChart(input: ItemCrossRealmDto): Promise<ItemChartDto> {
    const { item, realm } = await this.validateTransformDmaQuery(input._id);
    if (!item) {
      throw new BadRequestException('Please provide correct item');
    }

    const redisRealmKey = realm
      .sort((a, b) => b._id - a._id)
      .map((connectedRealm) =>
        isGold
          ? `${connectedRealm._id}:${connectedRealm.golds}`
          : `${connectedRealm._id}:${connectedRealm.auctions}`,
      )
      .join(':');

    const redisGoldKey = `GOLD:CHART:${redisRealmKey}`;

    const itemChartDto = await this.redisService.get(redisGoldKey);
    if (itemChartDto) {
      return JSON.parse(itemChartDto) as ItemChartDto;
    }

    const isGold = item._id === 1;
    const isXrs = realm.length > 1;
    const isCommdty = false;
    const connectedRealmsIds = realm.map((connectedRealm) => connectedRealm._id);

    const yAxis = await this.buildYAxis({
      itemId: item._id,
      connectedRealmsIds,
      isCommdty,
      isXrs,
      isGold,
    });
    const xAxis: (string | number | Date)[] = [];
    const dataset: IChartOrder[] = [];

    await lastValueFrom(
      from(realm).pipe(
        mergeMap(async (connectedRealm, i) => {
          if (isXrs) {
            /** Build X axis */
            xAxis[i] = connectedRealm.realms.join(', ');
            /** Build Cluster from Orders */
            const orderDataset = await this.goldXRS(
              yAxis,
              connectedRealm.connected_realm_id,
              connectedRealm.golds,
              i,
            );
            if (orderDataset && orderDataset.length) {
              dataset.push(...orderDataset);
            }
          } else {
            /** Build Cluster by Timestamp */
            const { chart, timestamps } = await this.goldIntraDay(
              yAxis,
              connectedRealm.connected_realm_id,
            );
            if (chart && timestamps) {
              dataset.push(...chart);
              xAxis.push(...timestamps);
            }
          }
        }),
      ),
    );

    /**
     * Cache result in Redis
     */
    if (!isXrs && redisGoldKey) {
      await this.redisService.set(
        redisGoldKey,
        JSON.stringify({ yAxis, xAxis, dataset }),
        'EX',
        3600,
      );
    }

    return { yAxis, xAxis, dataset };
  }

  // TODO this should be refactored
  async getItemChart(input: ItemCrossRealmDto): Promise<ItemChartDto> {
    const { item, realm } = await this.validateTransformDmaQuery(input._id);
    if (!item) {
      throw new BadRequestException('Please provide correct item');
    }

    const isCommdty =
      item.asset_class.includes(VALUATION_TYPE.COMMDTY) ||
      (item.stackable && item.stackable > 1);
    const isGold = item._id === 1;
    const isXrs = realm.length > 1;

    /**
     * Return from cache
     * only nonXRS chart
     */
    let redisItemKey: string | undefined = undefined;
    if (!isXrs) {
      const realmCompoundKey = realm
        .sort((a, b) => b._id - a._id)
        .map((connectedRealm) =>
          isGold
            ? `${connectedRealm._id}:${connectedRealm.golds}`
            : `${connectedRealm._id}:${connectedRealm.auctions}`,
        )
        .join(':');

      redisItemKey = `${item._id}:${realmCompoundKey}`;

      const itemChartDto = await this.redisService.get(redisItemKey);
      if (itemChartDto) {
        return JSON.parse(itemChartDto) as ItemChartDto;
      }
    }

    const connectedRealmsIds = realm.map((connectedRealm) => connectedRealm._id);
    const yAxis = await this.buildYAxis({
      itemId: item._id,
      connectedRealmsIds,
      isCommdty,
      isXrs,
      isGold,
    });
    const xAxis: (string | number | Date)[] = [];
    const dataset: IChartOrder[] = [];

    await lastValueFrom(
      from(realm).pipe(
        mergeMap(async (connectedRealm, i) => {
          if (isCommdty) {
            if (isXrs) {
              /** Build X axis */
              xAxis[i] = connectedRealm.realms.join(', ');
              /** Build Cluster from Orders */
              if (isGold) {
                const orderDataset = await this.goldXRS(
                  yAxis,
                  connectedRealm.connected_realm_id,
                  connectedRealm.golds,
                  i,
                );
                if (orderDataset && orderDataset.length) {
                  dataset.push(...orderDataset);
                }
              }
            }

            if (!isXrs) {
              /** Build Cluster by Timestamp */
              if (isGold) {
                const { chart, timestamps } = await this.goldIntraDay(
                  yAxis,
                  connectedRealm.connected_realm_id,
                );
                if (chart && timestamps) {
                  dataset.push(...chart);
                  xAxis.push(...timestamps);
                }
              }
            }
          }
        }),
      ),
    );

    /**
     * Cache result in Redis
     */
    if (!isXrs && redisItemKey) {
      await this.redisService.set(
        redisItemKey,
        JSON.stringify({ yAxis, xAxis, dataset }),
        'EX',
        3600,
      );
    }

    return { yAxis, xAxis, dataset };
  }

  private priceRangeY(quotes: number[], blocks: number): number[] {
    if (!quotes.length) return [];
    const length = quotes.length > 3 ? quotes.length - 3 : quotes.length;
    const start = length === 1 ? 0 : 1;

    const cap = Math.round(quotes[Math.floor(length * 0.9)]);
    const floor = Math.round(quotes[start]);
    const priceRange = cap - floor;
    /** Step represent 2.5% for each cluster */
    const tick = priceRange / blocks;
    return Array(Math.ceil((cap + tick - floor) / tick))
      .fill(floor)
      .map((x, y) => parseFloat((x + y * tick).toFixed(4)));
  }

  async buildYAxis(args: IBuildYAxis): Promise<number[]> {
    const { itemId, isCommdty, isXrs, isGold } = args;
    /**
     * Control price level
     * if XRS => 40
     * else => 20
     */
    const blocks: number = isXrs ? 40 : 20;
    let connectedRealmsIds: undefined | number[] = args.connectedRealmsIds;

    if (!connectedRealmsIds.length) connectedRealmsIds = undefined;

    if (!isGold && isCommdty) {
      /** Find distinct prices for commdty item across all realms */
      const quotes = await this.AuctionModel.find({ item_id: itemId }, 'price')
        .hint({ connected_realm_id: -1, item_id: -1, last_modified: -1 })
        .distinct('price');

      return this.priceRangeY(quotes, blocks);
    }

    /** Request oldest from latest or all timestamps */
    if (isGold) {
      const searchByGold: FilterQuery<Gold> = {};

      if (connectedRealmsIds) {
        Object.assign(searchByGold, {
          connected_realm_id: { $in: connectedRealmsIds },
        });
      }

      if (isXrs) {
        const { golds } = await this.RealmModel.findOne({
          connected_realm_id: { $in: connectedRealmsIds },
        })
          .lean()
          .select('golds')
          .sort({ golds: 1 });
        Object.assign(searchByGold, { last_modified: { $gte: golds } });
      }

      const quotes: number[] = await this.GoldModel.find(
        searchByGold,
        'price',
      ).distinct('price');
      return this.priceRangeY(quotes, blocks);
    }

    if (!isGold && !isCommdty) {
      const searchByAuctions: FilterQuery<Auction> = { 'item.id': itemId };

      if (connectedRealmsIds) {
        Object.assign(searchByAuctions, {
          connected_realm_id: { $in: connectedRealmsIds },
        });
      }

      if (isXrs) {
        const { auctions } = await this.RealmModel.findOne({
          connected_realm_id: { $in: connectedRealmsIds },
        })
          .lean()
          .select('auctions')
          .sort({ auctions: 1 });
        Object.assign(searchByAuctions, { last_modified: { $gte: auctions } });
      }

      /** Find distinct prices for each realm */
      const quotes: number[] = await this.AuctionModel.find(
        searchByAuctions,
        'price',
      )
        .hint({ connected_realm_id: -1, last_modified: -1, item_id: -1 })
        .distinct('price');

      return this.priceRangeY(quotes, blocks);
    }

    return [];
  }

  async goldXRS(
    yAxis: number[],
    connectedRealmIDs: number,
    golds: number,
    xIndex: number,
  ): Promise<IChartOrder[]> {
    if (!yAxis.length) return [];

    const orders = await this.GoldModel.aggregate<IOrderXrs>([
      {
        $match: {
          status: 'Online',
          connected_realm_id: connectedRealmIDs,
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
              $sum: { $multiply: ['$price', { $divide: ['$quantity', 1000] }] },
            },
          },
        },
      },
    ]).allowDiskUse(true);

    return this.buildDataset(yAxis, orders, xIndex);
  }

  async commdtyXRS(
    yAxis: number[],
    itemId: number,
    connectedRealmIDs: number,
    auctions: number,
    xIndex: number,
  ): Promise<IChartOrder[]> {
    if (!yAxis.length) return [];

    const orders = await this.AuctionModel.aggregate<IOrderXrs>([
      {
        $match: {
          connected_realm_id: connectedRealmIDs,
          'item.id': itemId,
          last_modified: { $eq: auctions },
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
              $sum: { $multiply: ['$price', '$quantity'] },
            },
          },
        },
      },
    ]).allowDiskUse(true);

    return this.buildDataset(yAxis, orders, xIndex);
  }

  async goldIntraDay(yAxis: number[], connectedRealmId: number) {
    const chart: IChartOrder[] = [];
    if (!yAxis.length) return { chart };
    if (!connectedRealmId) return { chart };
    /** Find distinct timestamps for each realm */
    const timestamps: number[] = await this.GoldModel.find(
      { connected_realm_id: connectedRealmId },
      'last_modified',
    ).distinct('last_modified');

    timestamps.sort((a, b) => a - b);

    await lastValueFrom(
      from(timestamps).pipe(
        mergeMap(async (timestamp, i) => {
          await this.GoldModel.aggregate([
            {
              $match: {
                status: 'Online',
                connected_realm_id: connectedRealmId,
                last_modified: timestamp,
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
                    $sum: {
                      $multiply: ['$price', { $divide: ['$quantity', 1000] }],
                    },
                  },
                },
              },
            },
            {
              $addFields: { xIndex: i },
            },
          ])
            .allowDiskUse(true)
            .cursor()
            .eachAsync(
              (order: IOrderXrs) => {
                const yIndex = yAxis.findIndex((pQ) => pQ === order._id);
                if (yIndex !== -1) {
                  chart.push({
                    x: order.xIndex,
                    y: yIndex,
                    orders: order.orders,
                    value: order.value,
                    oi: parseInt(order.oi.toFixed(0), 10),
                  });
                } else if (order._id === 'Other') {
                  if (order.price > yAxis[yAxis.length - 1]) {
                    chart.push({
                      x: order.xIndex,
                      y: yAxis.length - 1,
                      orders: order.orders,
                      value: order.value,
                      oi: parseInt(order.oi.toFixed(0), 10),
                    });
                  } else {
                    chart.push({
                      x: order.xIndex,
                      y: 0,
                      orders: order.orders,
                      value: order.value,
                      oi: parseInt(order.oi.toFixed(0), 10),
                    });
                  }
                }
              },
              { parallel: 20 },
            );
        }),
      ),
    );

    return { chart, timestamps };
  }

  async buildCommdtyChart(yAxis: number[], xAxis: number[], itemId: number) {
    const dataset: IChartOrder[] = [];
    if (!yAxis.length) return { dataset };
    /** Find distinct timestamps for each realm */

    await lastValueFrom(
      from(xAxis).pipe(
        mergeMap(async (timestamp, i) => {
          await this.AuctionModel.aggregate([
            {
              $match: {
                'item.id': itemId,
                last_modified: timestamp,
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
                  oi: { $sum: { $multiply: ['$price', '$quantity'] } },
                },
              },
            },
            {
              $addFields: {
                xIndex: i,
                oi: { $trunc: ['$oi', 2] },
              },
            },
          ])
            .allowDiskUse(true)
            .cursor()
            .eachAsync(
              (order: IOrderXrs) => {
                const yIndex = yAxis.findIndex((pQ) => pQ === order._id);
                if (yIndex !== -1) {
                  dataset.push({
                    x: order.xIndex,
                    y: yIndex,
                    orders: order.orders,
                    value: order.value,
                    oi: order.oi,
                  });
                } else if (order._id === 'Other') {
                  if (order.price > yAxis[yAxis.length - 1]) {
                    dataset.push({
                      x: order.xIndex,
                      y: yAxis.length - 1,
                      orders: order.orders,
                      value: order.value,
                      oi: order.oi,
                    });
                  } else {
                    dataset.push({
                      x: order.xIndex,
                      y: 0,
                      orders: order.orders,
                      value: order.value,
                      oi: order.oi,
                    });
                  }
                }
              },
              { parallel: 20 },
            );
        }),
      ),
    );

    return { dataset };
  }

  private buildDataset(
    yAxis: number[],
    orders: IOrderXrs[],
    xIndex: number,
  ): IChartOrder[] {
    return orders.map((order) => {
      const yIndex = yAxis.findIndex((pQ) => pQ === order._id);
      if (yIndex !== -1) {
        return {
          x: xIndex,
          y: yIndex,
          orders: order.orders,
          value: order.value,
          oi: parseInt(order.oi.toFixed(0), 10),
        };
      } else if (order._id === 'Other') {
        if (order.price > yAxis[yAxis.length - 1]) {
          return {
            x: xIndex,
            y: yAxis.length - 1,
            orders: order.orders,
            value: order.value,
            oi: parseInt(order.oi.toFixed(0), 10),
          };
        } else {
          return {
            x: xIndex,
            y: 0,
            orders: order.orders,
            value: order.value,
            oi: parseInt(order.oi.toFixed(0), 10),
          };
        }
      }
    });
  }

  async getAssetQuotes(input: ItemCrossRealmDto): Promise<ItemQuotesDto> {
    const { item, realm } = await this.validateTransformDmaQuery(input._id);
    if (!item) {
      throw new BadRequestException('Please provide correct item in your query');
    }

    const isSingleRealm = realm && realm.length === 1;
    const isXrs = realm && realm.length > 1;
    const isGold = item._id === 1;

    const quotes: IOrderQuotes[] = [];

    if (isXrs || isSingleRealm) {
      await lastValueFrom(
        from(realm).pipe(
          mergeMap(async (connectedRealm) => {
            const orderQuotes = await this.getOrderQuotes({
              model: isGold ? this.GoldModel : this.AuctionModel,
              itemId: item._id,
              connectedRealmId: connectedRealm.connected_realm_id,
              timestamp: isGold ? connectedRealm.golds : connectedRealm.auctions,
            });
            quotes.push(...orderQuotes);
          }),
        ),
      );
    } else if (!isGold) {
      const orderQuotes = await this.getOrderQuotes({
        model: this.AuctionModel,
        itemId: item._id,
      });
      quotes.push(...orderQuotes);
    }

    return { quotes };
  }

  async getOrderQuotes(
    args: IGetCommdtyOrders,
  ): Promise<Aggregate<Array<IOrderQuotes>>> {
    const { model, itemId } = args;
    const isGold = itemId === 1;

    const matchStage = isGold
      ? {
          $match: {
            'item.id': itemId,
          },
        }
      : {
          $match: {
            status: 'Online',
          },
        };

    if (args.connectedRealmId) {
      matchStage.$match.connected_realm_id = args.connectedRealmId;
    }

    if (args.timestamp) {
      matchStage.$match.last_modified = args.timestamp;
    }

    const projectStage = isGold
      ? {
          $project: {
            id: '$id',
            quantity: '$quantity',
            price: {
              $ifNull: ['$buyout', { $ifNull: ['$bid', '$price'] }],
            },
          },
        }
      : {
          $project: {
            id: '$id',
            quantity: '$quantity',
            price: '$price',
            owner: '$owner',
          },
        };

    const groupStage = isGold
      ? {
          $group: {
            _id: '$price',
            quantity: { $sum: '$quantity' },
            open_interest: { $sum: { $multiply: ['$price', '$quantity'] } },
            orders: { $addToSet: '$id' },
          },
        }
      : {
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
        };

    const sortStage = {
      $sort: { _id: 1 },
    };

    const formatStage = isGold
      ? {
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
        }
      : {
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
        };

    return model.aggregate<IOrderQuotes>([
      matchStage,
      projectStage,
      groupStage,
      sortStage,
      formatStage,
    ]);
  }

  async getItemFeed(input: ItemCrossRealmDto): Promise<ItemFeedDto> {
    const { item, realm } = await this.validateTransformDmaQuery(input._id);
    if (!item || !realm || !realm.length) {
      throw new BadRequestException(
        'Please provide correct item@realm;realm;realm in your query',
      );
    }
    /**
     * Item should be not commodity
     */
    const isCommdty =
      item.asset_class.includes(VALUATION_TYPE.COMMDTY) ||
      (item.stackable && item.stackable > 1);

    const feed: LeanDocument<Auction>[] = [];

    if (!isCommdty) {
      await lastValueFrom(
        from(realm).pipe(
          mergeMap(async (connected_realm) => {
            const orderFeed = await this.AuctionModel.find({
              connected_realm_id: connected_realm._id,
              'item.id': item._id,
              last_modified: connected_realm.auctions,
            }).lean();
            // TODO possible eachAsync cursor;
            feed.push(...orderFeed);
          }),
        ),
      );
    }

    return { feed };
  }

  async validateTransformDmaQuery(input: string) {
    let item: LeanDocument<Item>, realm: IARealm[];

    const [queryItem, queryRealm] = input.split('@');

    if (queryItem) {
      if (isNaN(Number(queryItem))) {
        item = await this.ItemModel.findOne(
          { $text: { $search: queryItem } },
          { score: { $meta: 'textScore' } },
        )
          .sort({ score: { $meta: 'textScore' } })
          .lean();
      } else {
        item = await this.ItemModel.findById(parseInt(queryItem)).lean();
      }
    }

    if (!queryRealm) return { item };

    const realmArrayString = queryRealm.split(';').filter(Boolean);

    const projectStage = { $addFields: { score: { $meta: 'textScore' } } };
    const sortStage = { $sort: { score: { $meta: 'textScore' } } };
    const limitStage = { $limit: 1 };
    const groupStage = {
      $group: {
        _id: '$connected_realm_id',
        realms: { $addToSet: '$name_locale' },
        connected_realm_id: { $first: '$connected_realm_id' },
        slug: { $first: '$slug' },
        auctions: { $first: '$auctions' },
        golds: { $first: '$golds' },
        valuations: { $first: '$valuations' },
      },
    };

    if (realmArrayString.length === 1) {
      if (isNaN(Number(queryRealm))) {
        /** if string */
        realm = await this.RealmModel.aggregate<IARealm>([
          { $match: { $text: { $search: queryRealm } } },
          projectStage,
          sortStage,
          groupStage,
          limitStage,
        ]);
      } else {
        /** if number */
        realm = await this.RealmModel.aggregate<IARealm>([
          { $match: { connected_realm_id: parseInt(queryRealm) } },
          projectStage,
          sortStage,
          groupStage,
          limitStage,
        ]);
      }
    } else {
      const queryRealms = realmArrayString.toString().replace(';', ' ');
      realm = await this.RealmModel.aggregate<IARealm>([
        { $match: { $text: { $search: queryRealms } } },
        projectStage,
        sortStage,
        groupStage,
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
