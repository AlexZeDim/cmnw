import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Pricing, SkillLine, SpellEffect, SpellReagents } from '@app/mongo';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import {
  ICsvReagents,
  DMA_SOURCE,
  EXPANSION_TICKER,
  GLOBAL_DMA_KEY,
  PRICING_TYPE,
  pricingQueue,
  IQPricing,
} from '@app/core';
import { BlizzAPI } from 'blizzapi';
import { Queue } from 'bullmq';
import fs from 'fs-extra';
import path from 'path';
import csv from 'async-csv';
import { Cron, CronExpression } from '@nestjs/schedule';
import { pricingConfig } from '@app/configuration';
import { DISENCHANT, MILLING, PROSPECT } from './lib';
import { from, lastValueFrom, mergeMap } from 'rxjs';

@Injectable()
export class PricingService implements OnApplicationBootstrap {

  private readonly logger = new Logger(
    PricingService.name, { timestamp: true },
  );

  private BNet: BlizzAPI;

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(SkillLine.name)
    private readonly SkillLineModel: Model<SkillLine>,
    @InjectModel(SpellEffect.name)
    private readonly SpellEffectModel: Model<SpellEffect>,
    @InjectModel(SpellReagents.name)
    private readonly SpellReagentsModel: Model<SpellReagents>,
    @InjectModel(Pricing.name)
    private readonly PricingModel: Model<Pricing>,
    @BullQueueInject(pricingQueue.name)
    private readonly queue: Queue<IQPricing, number>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexPricing(GLOBAL_DMA_KEY, pricingConfig.init);
    await this.buildPricing(pricingConfig.build);
    await this.libPricing(pricingConfig.libPricing, ['prospect', 'disenchant', 'milling']);
  }

  async libPricing(init: boolean = true, libs: string[] = ['prospect', 'disenchant', 'milling']): Promise<void> {
    try {
      await this.PricingModel.deleteMany({ createdBy: DMA_SOURCE.LAB });
      this.logger.log(`libPricing: ${DMA_SOURCE.LAB}`);

      const reversePricingMethod = {
        mask: 'NAME',
        media: 'MEDIA',
        spell_id: 0,
        profession: 'PROFESSION',
        expansion: 'SHDW',
        type: PRICING_TYPE.REVERSE,
        createdBy: DMA_SOURCE.LAB,
        updatedBy: DMA_SOURCE.LAB,
      };

      if (libs.includes('prospect')) {
        reversePricingMethod.mask = PROSPECT.name;
        reversePricingMethod.media = 'https://render-eu.worldofwarcraft.com/icons/56/inv_misc_gem_bloodgem_01.jpg';
        reversePricingMethod.spell_id = 31252;

        await lastValueFrom(
          from(PROSPECT.methods).pipe(
            mergeMap(async (method) => {
              await this.PricingModel.create({
                recipe_id: parseInt(`${reversePricingMethod.spell_id}${method.reagents[0]._id}`),
                reagents: method.reagents,
                derivatives: method.derivatives,
                media: reversePricingMethod.media,
                spell_id: reversePricingMethod.spell_id,
                profession: reversePricingMethod.profession,
                type: reversePricingMethod.type,
                createdBy: reversePricingMethod.createdBy,
                updatedBy: reversePricingMethod.updatedBy,
              });
            }),
          ),
        );
      }

      if (libs.includes('milling')) {
        reversePricingMethod.mask = MILLING.name;
        reversePricingMethod.media = 'https://render-eu.worldofwarcraft.com/icons/56/ability_miling.jpg';
        reversePricingMethod.spell_id = 51005;

        await lastValueFrom(
          from(MILLING.methods).pipe(
            mergeMap(async (method) => {
              await this.PricingModel.create({
                recipe_id: parseInt(`${reversePricingMethod.spell_id}${method.reagents[0]._id}`),
                reagents: method.reagents,
                derivatives: method.derivatives,
                media: reversePricingMethod.media,
                spell_id: reversePricingMethod.spell_id,
                profession: reversePricingMethod.profession,
                type: reversePricingMethod.type,
                createdBy: reversePricingMethod.createdBy,
                updatedBy: reversePricingMethod.updatedBy,
              });
            }),
          ),
        );
      }

      if (libs.includes('disenchant')) {
        reversePricingMethod.mask = DISENCHANT.name;
        reversePricingMethod.media = 'https://render-eu.worldofwarcraft.com/icons/56/inv_enchant_disenchant.jpg';
        reversePricingMethod.spell_id = 13262;

        await lastValueFrom(
          from(DISENCHANT.methods).pipe(
            mergeMap(async (method) => {
              await this.PricingModel.create({
                recipe_id: parseInt(`${reversePricingMethod.spell_id}${method.reagents[0]._id}`),
                reagents: method.reagents,
                derivatives: method.derivatives,
                media: reversePricingMethod.media,
                spell_id: reversePricingMethod.spell_id,
                profession: reversePricingMethod.profession,
                type: reversePricingMethod.type,
                createdBy: reversePricingMethod.createdBy,
                updatedBy: reversePricingMethod.updatedBy,
              });
            }),
          ),
        );
      }

    } catch (errorOrException) {
      this.logger.error(`libPricing: ${errorOrException}`);
    }
  }

  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_10AM)
  async indexPricing(clearance: string = GLOBAL_DMA_KEY, init: boolean = true): Promise<void> {
    try {
      if (!init) {
        this.logger.log(`indexPricing: init: ${init}`);
        return;
      }

      const key = await this.KeyModel.findOne({ tags: clearance });
      if (!key || !key.token) {
        this.logger.error(`indexPricing: clearance: ${clearance} key not found`);
        return;
      }

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const { professions } = await this.BNet.query('/data/wow/profession/index', {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' },
      });

      for (let profession of professions) {
        const { skill_tiers } = await this.BNet.query(`/data/wow/profession/${profession.id}`, {
          timeout: 10000,
          headers: { 'Battlenet-Namespace': 'static-eu' },
        });
        if (!skill_tiers) continue;

        for (let tier of skill_tiers) {
          let expansion: string = 'CLSC';
          Array.from(EXPANSION_TICKER.entries()).some(([k, v]) => {
            tier.name.en_GB.includes(k) ? (expansion = v) : '';
          });
          const { categories } = await this.BNet.query(`/data/wow/profession/${profession.id}/skill-tier/${tier.id}`, {
            timeout: 10000,
            headers: { 'Battlenet-Namespace': 'static-eu' },
          });
          if (!categories) continue;

          for (let category of categories) {
            const { recipes } = category;
            if (!recipes) continue;

            for (let recipe of recipes) {
              await this.queue.add(
                `${recipe.id}`,
                {
                  recipe_id: recipe.id,
                  expansion: expansion,
                  profession: profession.id,
                  region: 'eu',
                  clientId: key._id,
                  clientSecret: key.secret,
                  accessToken: key.token,
                }, { jobId: `${recipe.id}` },
              );
            }
          }
        }
      }

    } catch (errorOrException) {
      this.logger.error(`indexPricing: ${errorOrException}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  async buildPricing(init: boolean = true): Promise<void> {
    try {
      if (!init) {
        this.logger.log(`buildPricing: init: ${init}`);
        return;
      }

      const dir = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dir);

      const files = await fs.readdir(dir);
      for (const file of files) {
        let Model;

        if (file === 'skilllineability.csv') Model = this.SkillLineModel;
        if (file === 'spelleffect.csv') Model = this.SpellEffectModel;
        if (file === 'spellreagents.csv') Model = this.SpellReagentsModel;

        if (!Model) {
          this.logger.log(`buildPricing: for file ${file} model has not been found`);
          continue;
        }

        const csvString = await fs.readFile(path.join(dir, file), 'utf-8');

        const rows: any[] = await csv.parse(csvString, {
          columns: true,
          skip_empty_lines: true,
          cast: value => (!isNaN(value as any)) ? parseInt(value) : value,
        });

        for (const row of rows) {
          /**
           *  SpellEffectDB
           *
           *  Effect - effect flag
           *  EffectItemType - item_id
           *  EffectBasePointsF - item_quantity
           *  spellID - spell_id
           */
          if ('SpellID' in row) row.spell_id = row.SpellID;
          if ('Effect' in row) row.effect = row.Effect;
          if ('EffectItemType' in row) row.item_id = row.EffectItemType;
          if ('EffectBasePointsF' in row) row.item_quantity = row.EffectBasePointsF;

          /**
           * SkillLine
           *
           * SkillLine - professionID
           * Spell - spellID
           * SupersedesSpell - determines RANK of currentSpell, supersedes weak rank
           * MinSkillLineRank - require skill points
           * Flags: 0 or 16 ??????
           * NumSkillUps - skill points up on craft
           * TrivialSkillLineRankHigh - greenCraftQ
           * TrivialSkillLineRankLow - yellowCraftQ
           * SkillUpSkillLineID represent subCategory in professions, for expansionTicker
           */
          if ('SkillLine' in row) row.skill_line = row.SkillLine;
          if ('Spell' in row) row.spell_id = row.Spell;

          if ('SupersedesSpell' in row) row.supersedes_spell = row.SupersedesSpell;
          if ('MinSkillLineRank' in row) row.min_skill_rank = row.MinSkillLineRank;
          if ('NumSkillUps' in row) row.num_skill_ups = row.NumSkillUps;
          if ('TrivialSkillLineRankHigh' in row) row.green_craft = row.TrivialSkillLineRankHigh;
          if ('TrivialSkillLineRankLow' in row) row.yellow_craft = row.TrivialSkillLineRankLow;
          if ('SkillUpSkillLineID' in row) row.skill_up_skill_line_id = row.SkillUpSkillLineID;

          if (file.includes('spellreagents')) {
            const
              reagentsKeyIndex: number[] = [2, 3, 4, 5, 6, 7, 8, 9],
              quantityIndex: number[] = [10, 11, 12, 13, 14, 15, 16, 17],
              row_value: any[] = Object.values(row),
              reagents: Array<ICsvReagents> = [];

            reagentsKeyIndex.map((n, i) => {
              if (row_value[n] !== 0) {
                reagents.push({
                  _id: row_value[n],
                  quantity: row_value[quantityIndex[i]],
                });
              }
            });

            row.reagents = reagents;
          }

          if ('ID' in row) {
            row._id = row.ID;
            const document = await Model.findByIdAndUpdate(row._id, row,
              {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                lean: true,
              },
            );
            this.logger.log(`buildPricing: document ID:${document._id} has been updated`);
          }
        }
      }
    } catch (errorOrException) {
      this.logger.error(`buildPricing: ${errorOrException}`);
    }
  }
}
