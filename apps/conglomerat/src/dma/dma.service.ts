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
  ReqGetItemDto,
  valuationsQueue,
  WowtokenDto,
} from '@app/core';
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

  async getItemValuations(input: ItemCrossRealmDto) {}

  /**
   * @description Auctions DMA store in Redis Latest TimeStamp
   * @description We receive available timestamps for COMMDTY items
   */
  async getLatestTimestampCOMMDTY(itemId: number) {
    const commdtyTimestampKeys = await this.redisService.keys('COMMDTY:TS:*');
    const commdtyTimestamp = await this.redisService.mget(commdtyTimestampKeys);

    // TODO in case of Redis not found!

    const timestamps = commdtyTimestamp.map((t) => Number(t)).sort((a, b) => a - b);

    const lts = timestamps.slice(-1);

    const key = `COMMDTY:CHART:${itemId}:${lts}`;

    return { lts, timestamps, key };
  }

  async getChart(input: ReqGetItemDto): Promise<ItemChartDto> {
    const item = await this.queryDmaItem(input.id);
    // TODO check is gold

    const { timestamps, key } = await this.getLatestTimestampCOMMDTY(item.id);

    const getCacheItemChart = await this.redisService.get(key);
    if (getCacheItemChart) {
      return JSON.parse(getCacheItemChart) as ItemChartDto;
    }

    const yPriceAxis = await this.priceAxisCOMMDTY({
      itemId: item.id,
      isGold: false,
    });

    const { dataset } = await this.buildDataSet(yPriceAxis, timestamps, item.id);

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
    /** Step represent 5% for each cluster */
    const tick = priceRange / blocks;
    return Array(Math.ceil((cap + tick - floor) / tick))
      .fill(floor)
      .map((x, y) => parseFloat((x + y * tick).toFixed(4)));
  }

  async priceAxisCOMMDTY(args: IBuildYAxis): Promise<number[]> {
    const { itemId, isGold } = args;

    const blocks = 20;

    return this.yPriceRange(itemId, 20);

    return [];
  }

  async buildDataSet(yAxis: number[], xAxis: number[], itemId: number) {
    const dataset: IChartOrder[] = [];
    if (!yAxis.length) return { dataset };
    /** Find distinct timestamps for each realm */

    await lastValueFrom(
      from(xAxis).pipe(
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
          const plDataset = yAxis.map((pl, ytx) => ({
            lt: yAxis[ytx + 1] ?? pl, // TODO check
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
              order.price >= plDataset[priceItx].lt &&
              Boolean(plDataset[priceItx + 1]);

            if (isPriceItxUp) priceItx = priceItx + 1;
            plDataset[priceItx].orders = plDataset[priceItx].orders + 1;
            plDataset[priceItx].oi = plDataset[priceItx].oi + order.value;
            plDataset[priceItx].value = plDataset[priceItx].value + order.quantity;
            plDataset[priceItx].price =
              plDataset[priceItx].oi / plDataset[priceItx].value;
          }

          dataset.push(...plDataset);
        }),
      ),
    );

    return { dataset };
  }

  async getItemFeed(input: ItemCrossRealmDto): Promise<ItemFeedDto> {
    const { item, realm } = await this.queryDmaItem(input._id);
    /**
     * Item should be not commodity
     */

    const feed = await this.marketRepository.findBy({
      itemId: item.id,
      connectedRealmId: realm.connectedRealmId,
      timestamp: realm.auctionsTimestamp,
    });

    return { feed };
  }

  async queryDmaItem(input: string) {
    // TODO is @ exists

    const isID = isNaN(Number(input));
    if (isID) {
      // TODO text search
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
    // TODO WowToken criteria latest
    return this.marketRepository.find({
      where: {
        itemId: 1,
        connectedRealmId: 1,
        type: MARKET_TYPE.T,
      }, // TODO item ID for wowtoken
      order: { createdAt: -1 },
      take: input.limit ? input.limit : 1,
    });
  }
}
