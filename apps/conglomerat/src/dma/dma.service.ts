import { BadRequestException, Injectable } from '@nestjs/common';
import {
  IARealm,
  IBuildYAxis,
  IChartOrder,
  IGetCommdtyOrders,
  IOrderQuotes,
  IOrderXrs,
  IQItemValuation,
  ItemChartDto,
  ItemCrossRealmDto,
  ItemFeedDto,
  ItemQuotesDto,
  ItemValuationsDto,
  ReqGetItemDto,
  VALUATION_TYPE,
  valuationsQueue,
  WowtokenDto,
} from '@app/core';
import { Market, Gold, Item, Token, Valuations } from '@app/mongo';
import { Aggregate, FilterQuery } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity } from '@app/pg';
import { Repository } from 'typeorm';

@Injectable()
export class DmaService {
  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @BullQueueInject(valuationsQueue.name)
    private readonly queueValuations: Queue<IQItemValuation, number>,
  ) {}

  async getItem(input: ReqGetItemDto): Promise<ItemsEntity> {
    const isNotNumber = isNaN(Number(input.id));
    if (isNotNumber) {
      throw new BadRequestException('Please provide correct item ID in your query');
    }

    const id = parseInt(input.id);
    return await this.itemsRepository.findOneBy({ id });
  }

  async getItemValuations(input: ItemCrossRealmDto) {}

  // TODO dto for input
  async getChart(input: ReqGetItemDto): Promise<ItemChartDto> {
    const item = await this.queryDmaItem(input.id);
    /**
     * @description Auctions DMA store in Redis Latest TimeStamp
     * @description We receive available timestamps for COMMDTY items
     */
    const commdtyTimestampKeys = await this.redisService.keys('COMMDTY:TS:*');
    const commdtyTimestamp = await this.redisService.mget(commdtyTimestampKeys);
    const xTimestampAxis = commdtyTimestamp
      .map((t) => Number(t))
      .sort((a, b) => a - b);

    const [latestTimestamp] = xTimestampAxis.slice(-1);

    const redisItemKey = `COMMDTY:CHART:${item.id}:${latestTimestamp}`;
    const itemChartDto = await this.redisService.get(redisItemKey);
    if (itemChartDto) {
      return JSON.parse(itemChartDto) as ItemChartDto;
    }

    const yPriceAxis = await this.yPriceAxis({
      itemId: item.id,
      isCOMMDTY: true,
      isGold: false,
    });
    /**
     * @description Convert timestamps to numbers and sort in from old to new
     */

    const { dataset } = await this.buildCommdtyChart(
      yPriceAxis,
      xTimestampAxis,
      item.id,
    );

    await this.redisService.set(
      redisItemKey,
      JSON.stringify({ yAxis: yPriceAxis, xAxis: xTimestampAxis, dataset }),
      'EX',
      3600,
    );

    return { yAxis: yPriceAxis, xAxis: xTimestampAxis, dataset };
  }

  async getGoldChart(input: ItemCrossRealmDto): Promise<ItemChartDto> {
    const { item, realm } = await this.queryDmaItem(input._id);
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

    const yAxis = await this.yPriceAxis({
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
  async getChartCOMMDTY(input: ItemCrossRealmDto): Promise<ItemChartDto> {
    const item = await this.queryDmaItem(input._id);

    const isCOMMDTY =
      item.assetClass.includes(VALUATION_TYPE.COMMDTY) ||
      (item.stackable && item.stackable > 1);
    const isGold = item.id === 1;

    /**
     * Return from cache
     * only nonXRS chart
     */
    const redisItemKey = `${item.id}`;
    const itemChartDto = await this.redisService.get(redisItemKey);
    if (itemChartDto) {
      return JSON.parse(itemChartDto) as ItemChartDto;
    }

    const yPriceAxis = await this.yPriceAxis({
      itemId: item.id,
      isCOMMDTY,
      isGold,
    });

    const xTimestampAxis: Array<string | number | Date> = [];
    const dataset: IChartOrder[] = [];

    // TODO isGold
    /**
     * Cache result in Redis
     */
    await this.redisService.set(
      redisItemKey,
      JSON.stringify({ yAxis: yPriceAxis, xAxis: xTimestampAxis, dataset }),
      'EX',
      3600, // TODO expire valid until timestamp
    );

    return { yAxis: yPriceAxis, xAxis: xTimestampAxis, dataset };
  }

  private priceRangeY(quotes: number[], blocks: number) {
    if (!quotes.length) return [];
    const length = quotes.length > 3 ? quotes.length - 3 : quotes.length;
    const start = length === 1 ? 0 : 1;

    const cap = Math.round(quotes[Math.floor(length * 0.9)]);
    const floor = Math.round(quotes[start]);
    const priceRange = cap - floor;
    /** Step represent 5% for each cluster */
    const tick = priceRange / blocks;
    return Array(Math.ceil((cap + tick - floor) / tick))
      .fill(floor)
      .map((x, y) => parseFloat((x + y * tick).toFixed(4)));
  }

  async yPriceAxis(args: IBuildYAxis): Promise<number[]> {
    const { itemId, isCOMMDTY, isGold } = args;

    const blocks = 20;

    if (isCOMMDTY) {
      /** TODO review Find distinct prices for commdty item across all realms */
      const marketQuotes = await this.marketRepository
        .createQueryBuilder('markets')
        .where({ id: itemId }) // TODO itemId if GOLD add realmId
        .distinctOn(['markets.price'])
        .getMany();

      const quotes = marketQuotes.map((q) => q.price);

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
          // TODO cover with index
          const a = await this.marketRepository.find({
            where: {
              itemId,
              timestamp,
            },
          });

          const t = a.map(order => )

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
    yPriceAxis: number[],
    orders: IOrderXrs[],
    xIndex: number,
  ): IChartOrder[] {
    return orders.map((order) => {
      const yIndex = yPriceAxis.findIndex((pQ) => pQ === order._id);
      if (yIndex !== -1) {
        return {
          x: xIndex,
          y: yIndex,
          orders: order.orders,
          value: order.value,
          oi: parseInt(order.oi.toFixed(0), 10),
        };
      } else if (order._id === 'Other') {
        if (order.price > yPriceAxis[yPriceAxis.length - 1]) {
          return {
            x: xIndex,
            y: yPriceAxis.length - 1,
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
    const { item, realm } = await this.queryDmaItem(input._id);
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
    const { item, realm } = await this.queryDmaItem(input._id);
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

    const feed: LeanDocument<Market>[] = [];

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

  async queryDmaItem(input: string) {
    const isID = isNaN(Number(input));
    if (isID) {
      // TODO text search
    }

    const id = parseInt(input);
    const item = await this.itemsRepository.findOneBy({ id });

    if (!item) {
      throw new BadRequestException('Please provide correct item');
    }

    return item;
  }

  async getWowToken(input: WowtokenDto) {
    // TODO WowToken criteria latest
    return this.marketRepository.find({
      where: { itemId: 2 },
      order: { createdAt: -1 },
      take: input.limit ? input.limit : 1,
    });
  }
}
