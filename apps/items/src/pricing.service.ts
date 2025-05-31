import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { BlizzAPI } from 'blizzapi';
import { Queue } from 'bullmq';
import fs from 'fs-extra';
import path from 'path';
import csv from 'async-csv';
import { Cron, CronExpression } from '@nestjs/schedule';
import { pricingConfig } from '@app/configuration';
import { get } from 'lodash';
import { DISENCHANT, MILLING, PROSPECT } from './lib';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, PricingEntity, SkillLineEntity, SpellEffectEntity, SpellReagentsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import {
  DMA_SOURCE,
  EXPANSION_TICKER,
  GLOBAL_DMA_KEY,
  PRICING_TYPE,
  pricingQueue,
  IQPricing,
  getKey,
  ItemPricing,
  toStringOrNumber,
  SKILL_LINE_KEY_MAPPING,
  SPELL_EFFECT_KEY_MAPPING,
} from '@app/core';

@Injectable()
export class PricingService implements OnApplicationBootstrap {

  private readonly logger = new Logger(
    PricingService.name, { timestamp: true },
  );

  private BNet: BlizzAPI;

  constructor(
    @InjectQueue(pricingQueue.name)
    private readonly queue: Queue<IQPricing, number>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(PricingEntity)
    private readonly pricingRepository: Repository<PricingEntity>,
    @InjectRepository(SkillLineEntity)
    private readonly skillLineRepository: Repository<SkillLineEntity>,
    @InjectRepository(SpellReagentsEntity)
    private readonly spellReagentsRepository: Repository<SpellReagentsEntity>,
    @InjectRepository(SpellEffectEntity)
    private readonly spellEffectRepository: Repository<SpellEffectEntity>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    // await this.indexPricing(GLOBAL_DMA_KEY, pricingConfig.init);

    // await this.libPricing(pricingConfig.libPricing, true, true, true);

    //await this.buildSkillLine(pricingConfig.build);
    //await this.buildSpellEffect(pricingConfig.build);
    await this.buildSpellReagents(pricingConfig.build);
  }

  async libPricing(
    init: boolean = true,
    isProspect: boolean = false,
    isDisenchant: boolean = false,
    isMilling: boolean = false,
  ): Promise<void> {
    try {
      if (!init) {
        this.logger.debug(`libPricing: ${init}`);
        return;
      }

      const deletePricing = await this.pricingRepository.delete({ createdBy: DMA_SOURCE.LAB });
      this.logger.log(`libPricing: ${DMA_SOURCE.LAB} | deleted ${deletePricing.affected}`);

      const reversePricingMethod = this.pricingRepository.create({
        media: 'MEDIA',
        spellId: 0,
        profession: 'PROFESSION',
        expansion: 'TWW',
        type: PRICING_TYPE.REVERSE,
        createdBy: DMA_SOURCE.LAB,
        updatedBy: DMA_SOURCE.LAB,
      })

      if (isProspect) {
        reversePricingMethod.ticker = PROSPECT.name;
        reversePricingMethod.media = 'https://render-eu.worldofwarcraft.com/icons/56/inv_misc_gem_bloodgem_01.jpg';
        reversePricingMethod.spellId = 31252;

        await lastValueFrom(
          from(PROSPECT.methods).pipe(
            mergeMap(async (method) => {

              reversePricingMethod.reagents = method.reagents;
              reversePricingMethod.derivatives = method.derivatives;
              reversePricingMethod.recipeId = parseInt(`${reversePricingMethod.spellId}${method.reagents[0].id}`);

              await this.pricingRepository.save(reversePricingMethod);
            }),
          ),
        );
      }

      if (isMilling) {
        reversePricingMethod.ticker = MILLING.name;
        reversePricingMethod.media = 'https://render-eu.worldofwarcraft.com/icons/56/ability_miling.jpg';
        reversePricingMethod.spellId = 51005;

        await lastValueFrom(
          from(MILLING.methods).pipe(
            mergeMap(async (method) => {
              reversePricingMethod.reagents = method.reagents;
              reversePricingMethod.derivatives = method.derivatives;
              reversePricingMethod.recipeId = parseInt(`${reversePricingMethod.spellId}${method.reagents[0].id}`);

              await this.pricingRepository.save(reversePricingMethod);
            }),
          ),
        );
      }

      if (isDisenchant) {
        reversePricingMethod.ticker = DISENCHANT.name;
        reversePricingMethod.media = 'https://render-eu.worldofwarcraft.com/icons/56/inv_enchant_disenchant.jpg';
        reversePricingMethod.spellId = 13262;

        await lastValueFrom(
          from(DISENCHANT.methods).pipe(
            mergeMap(async (method) => {
              reversePricingMethod.reagents = method.reagents;
              reversePricingMethod.derivatives = method.derivatives;
              reversePricingMethod.recipeId = parseInt(`${reversePricingMethod.spellId}${method.reagents[0].id}`);

              await this.pricingRepository.save(reversePricingMethod);
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

      const key = await getKey(this.keysRepository, clearance);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const { professions } = await this.BNet.query<any>('/data/wow/profession/index', {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' },
      });

      for (let profession of professions) {
        const { skill_tiers } = await this.BNet.query<any>(`/data/wow/profession/${profession.id}`, {
          timeout: 10000,
          headers: { 'Battlenet-Namespace': 'static-eu' },
        });

        if (!skill_tiers) continue;

        for (let tier of skill_tiers) {
          let expansion: string = 'CLSC';

          Array.from(EXPANSION_TICKER.entries()).some(([k, v]) => {
            tier.name.en_GB.includes(k) ? (expansion = v) : '';
          });

          const { categories } = await this.BNet.query<any>(`/data/wow/profession/${profession.id}/skill-tier/${tier.id}`, {
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
                  recipeId: recipe.id,
                  expansion: expansion,
                  profession: profession.id,
                  region: 'eu',
                  clientId: key.client,
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

  async buildSkillLine(init: boolean = true): Promise<void> {
    if (!init) {
      this.logger.log(`buildSkillLine: init: ${init}`);
      return;
    }

    try {
      const pathToFile = path.join(__dirname, '..', '..', '..', 'files', 'skilllineability.csv')

      const skillLineAbilityCsv = fs.readFileSync(
        pathToFile,
        'utf8',
      );

      const skillLineAbilityRows: any[] = await csv.parse(skillLineAbilityCsv, {
        columns: true,
        skip_empty_lines: true,
        cast: (value: string | number) => toStringOrNumber(value),
      });

      const skillLineEntities = [];

      for (const row of skillLineAbilityRows) {
        const isIdExists = 'ID' in row;

        if (!isIdExists) continue;

        const id = row.ID;

        const isExists = await this.skillLineRepository.existsBy({ id });
        if (isExists) continue;

        const skillLineEntity = this.skillLineRepository.create({
          id: id,
        })
        /**
         * SkillLine
         *
         * SkillLine - professionID
         * Spell - spellID
         * SupersedesSpell - determines RANK of currentSpell, supersedes weak rank
         * MinSkillLineRank - require skill points
         * Flags: 0 or 16 ??????
         * NumSkillUps - skill points up, on craft
         * TrivialSkillLineRankHigh - greenCraftQ
         * TrivialSkillLineRankLow - yellowCraftQ
         * SkillUpSkillLineID represent subCategory in professions, for expansionTicker
         */
        for (const [key, path] of SKILL_LINE_KEY_MAPPING.entries()) {
          const value = get(row, path, null);
          if (value && key !== 'id') skillLineEntity[key] = value;
        }

        skillLineEntities.push(skillLineEntity);
      }

      const skillLineMethodsCount = skillLineEntities.length;

      this.logger.log(`buildSkillLine: ${skillLineMethodsCount} created`);

      await this.skillLineRepository.save(skillLineEntities, { chunk: 500 });

      this.logger.log(`buildSkillLine: ${skillLineMethodsCount} saved`);
    } catch (errorOrException) {
      this.logger.error(`buildSkillLine: ${errorOrException}`);
    }
  }

  async buildSpellEffect(init: boolean = true): Promise<void> {
    if (!init) {
      this.logger.log(`buildSpellEffect: init: ${init}`);
      return;
    }

    try {
      const pathToFile = path.join(__dirname, '..', '..', '..', 'files', 'spelleffect.csv')

      const spellEffectCsv = fs.readFileSync(
        pathToFile,
        'utf8',
      );

      const spellEffectRows: any[] = await csv.parse(spellEffectCsv, {
        columns: true,
        skip_empty_lines: true,
        cast: (value: string | number) => toStringOrNumber(value),
      });

      let spellEffectCount = 0

      for (const row of spellEffectRows) {
        const isIdExists = 'ID' in row;

        if (!isIdExists) continue;

        const id = row.ID;

        const isExists = await this.spellEffectRepository.existsBy({ id });
        if (isExists) continue;

        const skillLineEntity = this.spellEffectRepository.create({
          id: id,
        })
        /**
         *  SpellEffectDB
         *
         *  Effect - effect flag
         *  EffectItemType - itemId
         *  EffectBasePointsF - item_quantity
         *  spellID - spellId
         */
        for (const [key, path] of SPELL_EFFECT_KEY_MAPPING.entries()) {
          const value = get(row, path, null);
          if (value && key !== 'id') skillLineEntity[key] = value;
        }

        await this.spellEffectRepository.save(skillLineEntity);

        spellEffectCount = spellEffectCount + 1;
      }

      this.logger.log(`buildSpellEffect: ${spellEffectCount} created`);

      this.logger.log(`buildSpellEffect: ${spellEffectCount} saved`);
    } catch (errorOrException) {
      this.logger.error(`buildSpellEffect: ${errorOrException}`);
    }
  }

  async buildSpellReagents(init: boolean = true): Promise<void> {
    if (!init) {
      this.logger.log(`buildSpellReagents: init: ${init}`);
      return;
    }

    try {
      const pathToFile = path.join(__dirname, '..', '..', '..', 'files', 'spellreagents.csv')

      const spellReagentsCsv = fs.readFileSync(
        pathToFile,
        'utf8',
      );

      const spellReagentsRows: any[] = await csv.parse(spellReagentsCsv, {
        columns: true,
        skip_empty_lines: true,
        cast: (value: string | number) => toStringOrNumber(value),
      });

      const spellReagentsEntities = [];

      const reagentsKeyIndex = [2, 3, 4, 5, 6, 7, 8, 9];
      const quantityIndex = [10, 11, 12, 13, 14, 15, 16, 17];

      for (const row of spellReagentsRows) {
        const isIdExists = 'ID' in row;

        if (!isIdExists) continue;

        const id = row.ID;

        const isExists = await this.spellReagentsRepository.existsBy({ id });
        if (isExists) continue;

        const rowValues: any[] = Object.values(row);
        const reagents: Array<ItemPricing> = [];

        reagentsKeyIndex.forEach((n, i) => {
          if (rowValues[n] !== 0) {
            reagents.push({
              id: rowValues[n],
              quantity: rowValues[quantityIndex[i]],
            });
          }
        });


        const spellReagentsEntity = this.spellReagentsRepository.create({
          id: id,
          spellId: get(row, 'SpellID', null),
          reagents: reagents,
        })

        spellReagentsEntities.push(spellReagentsEntity);
      }

      const spellReagentsCount = spellReagentsEntities.length;

      this.logger.log(`buildSpellReagents: ${spellReagentsCount} created`);

      await this.spellEffectRepository.save(spellReagentsEntities, { chunk: 500 });

      this.logger.log(`buildSpellReagents: ${spellReagentsCount} saved`);
    } catch (errorOrException) {
      this.logger.error(`buildSpellReagents: ${errorOrException}`);
    }
  }
}
