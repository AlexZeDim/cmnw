import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { DMA_SOURCE, FACTION, PRICING_TYPE, pricingQueue } from '@app/core';
import { Logger } from '@nestjs/common';
import BlizzAPI, { BattleNetOptions } from 'blizzapi';
import { InjectModel } from '@nestjs/mongoose';
import { Pricing, SkillLine, SpellEffect, SpellReagents } from '@app/mongo';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import { PricingInterface, PricingMethods } from '@app/core/interfaces/dma.interface';
import { PROFESSION_TICKER } from '@app/core/constants/dma.constants';

@BullWorker({ queueName: pricingQueue.name })
export class PricingWorker {
  private readonly logger = new Logger(
    PricingWorker.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Pricing.name)
    private readonly PricingModel: Model<Pricing>,
    @InjectModel(SkillLine.name)
    private readonly SkillLineModel: Model<SkillLine>,
    @InjectModel(SpellEffect.name)
    private readonly SpellEffectModel: Model<SpellEffect>,
    @InjectModel(SpellReagents.name)
    private readonly SpellReagentsModel: Model<SpellReagents>,
  ) {}

  @BullWorkerProcess(pricingQueue.workerOptions)
  public async process(job: Job): Promise<number> {
    try {
      const writeConcerns: PricingMethods[] = [];

      const args: BattleNetOptions & PricingInterface = { ...job.data };
      await job.updateProgress(1);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken
      });

      const [recipe_data, recipe_media]: Record<string, any>[] = await Promise.all([
        this.BNet.query(`/data/wow/recipe/${args.recipe_id}`, {
          timeout: 10000,
          headers: { 'Battlenet-Namespace': 'static-eu' }
        }),
        this.BNet.query(`/data/wow/media/recipe/${args.recipe_id}`, {
          timeout: 10000,
          headers: { 'Battlenet-Namespace': 'static-eu' }
        })
      ]);
      /**
       * Skip Mass mill and prospect
       * because they are bugged
       */
      await job.updateProgress(25);
      if (recipe_data?.name?.en_GB && recipe_data.name.en_GB.includes('Mass')) return 203;

      if (recipe_data?.alliance_crafted_item?.id) {
        writeConcerns.push({
          faction: FACTION.A,
          recipe_id: args.recipe_id, //TODO rethink?
          item_id: recipe_data.alliance_crafted_item.id,
          reagents: recipe_data.reagents,
          expansion: args.expansion,
          item_quantity: 0
        })
      }

      if (recipe_data?.horde_crafted_item?.id) {
        writeConcerns.push({
          faction: FACTION.H,
          recipe_id: args.recipe_id,
          item_id: recipe_data.horde_crafted_item.id,
          reagents: recipe_data.reagents,
          expansion: args.expansion,
          item_quantity: 0,
        });
      }

      if (recipe_data?.crafted_item?.id) {
        writeConcerns.push({
          recipe_id: args.recipe_id,
          item_id: recipe_data.crafted_item.id,
          reagents: recipe_data.reagents,
          expansion: args.expansion,
          item_quantity: 0
        })
      }

      await job.updateProgress(35);
      for (const concern of writeConcerns) {
        let pricing_method = await this.PricingModel.findOne({ 'derivatives._id': concern.item_id, 'recipe_id': concern.recipe_id });

        if (!pricing_method) {
          pricing_method = new this.PricingModel({
            recipe_id: concern.recipe_id,
            create_by: DMA_SOURCE.API
          })
        }

        Object.assign(pricing_method, concern);
        await job.updateProgress(45);

        /**
         * Only SkillLineDB stores recipes by it's ID
         * so we need that spell_id later
         */
        const recipe_spell = await this.SkillLineModel.findById(pricing_method.recipe_id);
        if (!recipe_spell) {
          this.logger.error(`Consensus not found for ${pricing_method.recipe_id}`)
          continue
        }

        if (PROFESSION_TICKER.has(args.profession)) {
          pricing_method.profession = PROFESSION_TICKER.get(args.profession)
        } else if (PROFESSION_TICKER.has(recipe_spell.skill_line)) {
          pricing_method.profession = PROFESSION_TICKER.get(recipe_spell.skill_line)
        }

        pricing_method.spell_id = recipe_spell.spell_id;
        await job.updateProgress(50);

        const pricing_spell = await this.SpellEffectModel.findOne({ spell_id: pricing_method.spell_id });
        if (recipe_data.modified_crafting_slots && Array.isArray(recipe_data.modified_crafting_slots)) {
           recipe_data.modified_crafting_slots.map((mrs: { slot_type: { id: number } }) => {
             if (mrs.slot_type?.id) pricing_method.modified_crafting_slots.addToSet({ _id: mrs.slot_type.id })
           });
        }

        /**
         * If we don't have quantity from API,
         * then use locale source
         */
        await job.updateProgress(55);
        if (recipe_data?.crafted_quantity) {
          if (recipe_data.crafted_quantity.value) {
            concern.item_quantity = recipe_data.crafted_quantity.value;
          } else if (recipe_data.crafted_quantity.minimum) {
            concern.item_quantity = recipe_data.crafted_quantity.minimum;
          } else if (pricing_spell?.item_quantity && concern.item_quantity === 0) {
            concern.item_quantity = pricing_spell.item_quantity;
          }
        } else if (pricing_spell?.item_quantity) {
          concern.item_quantity = pricing_spell.item_quantity;
        }

        /**
         * Build reagent items
         * Rebuild reagents local if necessary
         */
        await job.updateProgress(60);
        if (recipe_data.reagents && recipe_data.reagents.length) {
          pricing_method.reagents = recipe_data.reagents.map((item: any) => ({
            _id: parseInt(item.reagent.id, 10),
            quantity: parseInt(item.quantity, 10),
          }));
        } else {
          const reagents = await this.SpellReagentsModel.findOne({ spell_id: pricing_method.spell_id });
          if (reagents) pricing_method.reagents = reagents.reagents;
        }

        /**
         * Derivatives from write concern
         */
        pricing_method.derivatives.addToSet({ _id: concern.item_id, quantity: concern.item_quantity });

        if (recipe_media) pricing_method.media = recipe_media.assets[0].value;

        pricing_method.updated_by = DMA_SOURCE.API;
        pricing_method.type = PRICING_TYPE.PRIMARY;

        await job.updateProgress(90);
        await pricing_method.save();
      }
      await job.updateProgress(100);
      return 200
    } catch (e) {
      this.logger.error(`${PricingWorker.name}: ${e}`)
      return 500
    }
  }
}
