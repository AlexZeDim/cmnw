import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { itemsConfig } from '@app/configuration';
import fs from 'fs-extra';
import path from 'path';
import csv from 'async-csv';
import { lastValueFrom, mergeMap, range } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity } from '@app/pg';
import { Repository } from 'typeorm';
import {
  EXPANSION_TICKER_ID,
  getKey,
  GLOBAL_KEY,
  GOLD_ITEM_ENTITY,
  IItemsParse,
  ItemJobQueue,
  itemsQueue,
  toStringOrNumber,
} from '@app/core';
import c from "config";

@Injectable()
export class ItemsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ItemsService.name, { timestamp: true });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
    @BullQueueInject(itemsQueue.name)
    private readonly queue: Queue<ItemJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexItems(
      GLOBAL_KEY,
      0,
      250000,
      itemsConfig.updateForce,
      itemsConfig.index,
    );
    await this.buildItems(itemsConfig.build);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexItems(
    clearance: string = GLOBAL_KEY,
    from = 0,
    to = 200000,
    updateForce = true,
    init = true,
  ): Promise<void> {
    try {
      this.logger.log(`indexItems: init: ${init}, updateForce: ${updateForce}`);
      if (!init) return;

      const count = Math.abs(from - to);
      const key = await getKey(this.keysRepository, clearance);

      const goldItemEntity = this.itemsRepository.create(GOLD_ITEM_ENTITY);
      await this.itemsRepository.save(goldItemEntity);

      await lastValueFrom(
        range(from, count).pipe(
          mergeMap(async (itemId) => {
            if (!updateForce) {
              const isItemExists = await this.itemsRepository.exist({
                where: { id: itemId },
              });

              if (isItemExists) return;
            }

            await this.queue.add(
              `${itemId}`,
              {
                itemId: itemId,
                region: 'eu',
                clientId: key.client,
                clientSecret: key.secret,
                accessToken: key.token,
              },
              {
                jobId: `item:${itemId}`,
              },
            );

            this.logger.log(`indexItems: item ${itemId} placed in queue`);
          }),
        ),
      );
    } catch (errorException) {
      this.logger.error(`indexItems: ${errorException}`);
    }
  }

  async buildItems(init = false): Promise<void> {
    try {
      this.logger.log(`buildItems: init: ${init}`);
      if (!init) return;

      const filesPath = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(filesPath);

      const files = await fs.readdir(filesPath);
      // TODO taxonomy
      // const isTaxonomyExists = files.includes('taxonomy.csv');
      const isItemsParseExists = files.includes('itemsparse.csv');

      if (isItemsParseExists)
        await this.extendItemsParse(filesPath, `itemsparse.csv`);
    } catch (errorException) {
      this.logger.error(`buildItems: ${errorException}`);
    }
  }

  async extendItemsParse(filesPath: string, file: string) {
    const filePath = path.join(filesPath, file);
    const csvString = await fs.readFile(filePath, 'utf-8');

    const rows = await csv.parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      cast: (value: number | string) => toStringOrNumber(value),
    });

    for (const row of rows as Array<IItemsParse>) {
      const { ID: itemId, Stackable: stackable, ExpansionID: expansionId } = row;
      const itemEntity: Partial<ItemsEntity> = {
        stackable,
      };

      const hasExpansion = EXPANSION_TICKER_ID.has(expansionId);
      if (hasExpansion) {
        itemEntity.expansion = EXPANSION_TICKER_ID.get(expansionId);
      }

      await this.itemsRepository.update({ id: itemId }, itemEntity);
    }
  }
}
