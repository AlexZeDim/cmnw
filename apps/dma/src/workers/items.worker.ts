import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { get } from 'lodash';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  BlizzardApiItem,
  DMA_SOURCE,
  IItem,
  isItem,
  isItemMedia,
  isNamedField,
  ITEM_FIELD_MAPPING,
  ItemJobQueue,
  itemsQueue,
  toGold,
  TOLERANCE_ENUM,
  VALUATION_TYPE,
} from '@app/core';

@BullWorker({ queueName: itemsQueue.name })
export class ItemsWorker {
  private readonly logger = new Logger(ItemsWorker.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
  ) {}

  @BullWorkerProcess(itemsQueue.workerOptions)
  public async process(job: Job<ItemJobQueue, number>): Promise<number> {
    try {
      const { data: args } = job;
      /**
       * @description Check is exits
       * @description If not, create
       */
      let itemEntity = await this.itemsRepository.findOneBy({ id: args.itemId });
      const isNew = !itemEntity;
      if (isNew) {
        itemEntity = this.itemsRepository.create({
          id: args.itemId,
          indexBy: DMA_SOURCE.API,
        });
      }

      await job.updateProgress(5);
      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });

      /** Request item data */
      const isMultiLocale = true;
      const [getItemSummary, getItemMedia] = await Promise.allSettled([
        this.BNet.query<BlizzardApiItem>(
          `/data/wow/item/${args.itemId}`,
          apiConstParams(API_HEADERS_ENUM.STATIC, TOLERANCE_ENUM.DMA, isMultiLocale),
        ),
        this.BNet.query(
          `/data/wow/media/item/${args.itemId}`,
          apiConstParams(API_HEADERS_ENUM.STATIC, TOLERANCE_ENUM.DMA),
        ),
      ]);

      const isItemValid = isItem(getItemSummary);
      if (!isItemValid) {
        return 404;
      }

      const gold = new Set(['sell_price', 'purchase_price']);
      const namedFields = new Set([
        'name',
        'quality',
        'item_class',
        'item_subclass',
        'inventory_type',
      ]);

      Object.keys(getItemSummary.value).forEach((key: keyof IItem) => {
        const isKeyInPath = ITEM_FIELD_MAPPING.has(key);
        if (isKeyInPath) {
          const property = ITEM_FIELD_MAPPING.get(key);
          let value = get(getItemSummary.value, property.path, null);
          const isFieldName = namedFields.has(key) ? isNamedField(value) : false;

          if (isFieldName) value = get(value, `en_GB`, null);

          if (gold.has(key)) {
            value = toGold(value);
          }

          if (value && value !== itemEntity[property.key])
            (itemEntity[property.key] as string | number) = value;
        }
      });

      if (isMultiLocale) {
        itemEntity.names = getItemSummary.value.name as unknown as string;
      }

      const isVSP =
        (itemEntity.vendorSellPrice && isNew) ||
        (itemEntity.vendorSellPrice &&
          itemEntity.assetClass &&
          !itemEntity.assetClass.includes(VALUATION_TYPE.VSP));

      if (isVSP) {
        const assetClass = new Set(itemEntity.assetClass).add(VALUATION_TYPE.VSP);
        itemEntity.assetClass = Array.from(assetClass);
      }

      const isItemMediaValid = isItemMedia(getItemMedia);
      if (isItemMediaValid) {
        const [icon] = getItemMedia.value.assets;
        itemEntity.icon = icon.value;
      }

      await this.itemsRepository.save(itemEntity);
      this.logger.log(`${itemEntity.id} | ${itemEntity.name}`);

      return 200;
    } catch (errorOrException) {
      await job.log(errorOrException);
      this.logger.error(errorOrException);
      return 500;
    }
  }
}
