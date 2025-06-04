import { BadRequestException, Injectable } from '@nestjs/common';
import {
  IBuildYAxis,
  IChartOrder,
  IQItemValuation,
  ItemChartDto,
  ItemCrossRealmDto,
  ItemFeedDto,
  ItemQuotesDto,
  MARKET_TYPE,
  REALM_ENTITY_ANY,
  ReqGetItemDto,
  valuationsQueue,
  WOW_TOKEN_ITEM_ID,
  WowtokenDto,
} from '@app/core';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity } from '@app/pg';
import { Repository } from 'typeorm';
import Redis from 'ioredis';

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
    @InjectQueue(valuationsQueue.name)
    private readonly queueValuations: Queue<IQItemValuation, number>,
  ) {}

  // TODO validation on DTO level
  async getItem(input: ReqGetItemDto): Promise<ItemsEntity> {
    const isNotNumber = isNaN(Number(input.id));
    if (isNotNumber) {
      throw new BadRequestException('Please provide correct item ID in your query');
    }

    const id = parseInt(input.id);
    // TODO return DTO?
    return await this.itemsRepository.findOneBy({ id });
  }

  async getItemValuations(input: ItemCrossRealmDto) {
    // @todo
  }

  /**
   * @description Auctions DMA store in Redis Latest TimeStamp
   * @description We receive available timestamps for COMMODITY items
   */
  async getLatestTimestampCommodity(itemId: number) {
    const commodityTimestampKeys = await this.redisService.keys('COMMODITY:TS:*');
    const commodityTimestamp = await this.redisService.mget(commodityTimestampKeys);

    // TODO in case of Redis not found!

    const timestamps = commodityTimestamp
      .map((t) => Number(t)).sort((a, b) => a - b);

    const latestCommodityTimestamp = timestamps.slice(-1);

    const key = `COMMODITY:CHART:${itemId}:${latestCommodityTimestamp}`;

    return { latestCommodityTimestamp, timestamps, key };
  }

  async getChart(input: ReqGetItemDto): Promise<ItemChartDto> {
    const item = await this.queryItem(input.id);

    const { timestamps, key } = await this.getLatestTimestampCommodity(item.id);

    // --- return cached chart from redis on exist -- //
    const getCacheItemChart = await this.redisService.get(key);
    if (getCacheItemChart) {
      return JSON.parse(getCacheItemChart) as ItemChartDto;
    }

    const yPriceAxis = await this.priceAxisCommodity({
      itemId: item.id,
      isGold: false,
    });

    const { dataset } = await this.buildChartDataset(yPriceAxis, timestamps, item.id);

    await this.redisService.set(
      key,
      JSON.stringify({ yAxis: yPriceAxis, xAxis: timestamps, dataset }),
      'EX',
      3600,
    );

    return { yAxis: yPriceAxis, xAxis: timestamps, dataset };
  }

  private async yPriceRange(itemId: number, blocks: number) {
    const marketQuotes = await this.marketRepository
      .createQueryBuilder('markets')
      .where({ itemId }) // TODO itemId if GOLD add realmId
      .distinctOn(['markets.price'])
      .getMany();

    const quotes = marketQuotes.map((q) => q.price);

    if (!quotes.length) return [];
    const length = quotes.length > 3 ? quotes.length - 3 : quotes.length;
    const start = length === 1 ? 0 : 1;

    const cap = Math.round(quotes[Math.floor(length * 0.9)]);
    const floor = Math.round(quotes[start]);
    const priceRange = cap - floor;
    // --- Step represents 5% for each cluster --- //
    const tick = priceRange / blocks;
    return Array(Math.ceil((cap + tick - floor) / tick))
      .fill(floor)
      .map((x, y) => parseFloat((x + y * tick).toFixed(4)));
  }

  async priceAxisCommodity(args: IBuildYAxis): Promise<number[]> {
    const { itemId, isGold } = args;

    const blocks = 20;

    return this.yPriceRange(itemId, blocks);
  }

  async buildChartDataset(yPriceAxis: number[], xTimestampAxis: number[], itemId: number) {
    const dataset: IChartOrder[] = [];
    if (!yPriceAxis.length) return { dataset };

    // --- Find distinct timestamps for each realm --- //
    await lastValueFrom(
      from(xTimestampAxis).pipe(
        mergeMap(async (timestamp, itx) => {
          // TODO cover with index
          const marketOrders = await this.marketRepository.find({
            where: {
              itemId,
              timestamp,
            },
            order: { price: 'ASC' },
          });

          // TODO push to global by TS
          const priceLevelDataset = yPriceAxis.map((priceLevel, ytx) => ({
            lt: yPriceAxis[ytx + 1] ?? priceLevel, // TODO check
            x: itx,
            y: ytx, // TODO price
            orders: 0,
            oi: 0,
            price: 0,
            value: 0,
          }));

          let priceItx = 0;

          for (const order of marketOrders) {
            const isPriceItxUp =
              order.price >= priceLevelDataset[priceItx].lt &&
              Boolean(priceLevelDataset[priceItx + 1]);

            if (isPriceItxUp) priceItx = priceItx + 1;
            priceLevelDataset[priceItx].orders = priceLevelDataset[priceItx].orders + 1;
            priceLevelDataset[priceItx].oi = priceLevelDataset[priceItx].oi + order.value;
            priceLevelDataset[priceItx].value = priceLevelDataset[priceItx].value + order.quantity;
            priceLevelDataset[priceItx].price =
              priceLevelDataset[priceItx].oi / priceLevelDataset[priceItx].value;
          }

          dataset.push(...priceLevelDataset);
        }),
      ),
    );

    return { dataset };
  }

  async a() {

  }

  async getItemFeed(input: ItemCrossRealmDto): Promise<ItemFeedDto> {
    const { item, realm } = await this.queryItem(input._id);

    // --- Item should be not commodity --- //
    const feed = await this.marketRepository.findBy({
      itemId: item.id,
      connectedRealmId: realm.connectedRealmId,
      timestamp: realm.auctionsTimestamp,
    });

    return { feed };
  }

  async queryItem(input: string) {
    // TODO is @ exists

    const isId = isNaN(Number(input));
    if (isId) {
      // TODO text search on postres
      throw new BadRequestException('Please provide correct item ID in your query');
    }

    const id = parseInt(input);
    const item = await this.itemsRepository.findOneBy({ id });

    // TODO if @ exists validate both
    if (!item) {
      throw new BadRequestException('Please provide correct item');
    }

    return item;
  }

  async getWowToken(input: WowtokenDto) {
    return this.marketRepository.find({
      where: {
        itemId: WOW_TOKEN_ITEM_ID,
        connectedRealmId: REALM_ENTITY_ANY.connectedRealmId,
        type: MARKET_TYPE.T,
      },
      order: { createdAt: -1 },
      take: input.limit ? input.limit : 1,
    });
  }
}
