import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { ExpansionTicker, GLOBAL_DMA_KEY, pricingQueue } from '@app/core';
import BlizzAPI from 'blizzapi';
import { Queue } from 'bullmq';

@Injectable()
export class PricingService {

  private readonly logger = new Logger(
    PricingService.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(pricingQueue.name)
    private readonly queue: Queue,
  ) {
    this.indexPricing(GLOBAL_DMA_KEY);
  }

  async indexPricing(clearance: string = GLOBAL_DMA_KEY): Promise<void> {
    try {
      const key = await this.KeyModel.findOne({ tags: clearance });
      if (!key || !key.token) {
        this.logger.error(`indexPricing: clearance: ${clearance} key not found`);
        return
      }

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token
      })

      const { professions } = await this.BNet.query(`/data/wow/profession/index`, {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' }
      });

      for (let profession of professions) {
        const { skill_tiers } = await this.BNet.query(`/data/wow/profession/${profession.id}`, {
          timeout: 10000,
          headers: { 'Battlenet-Namespace': 'static-eu' }
        });
        if (!skill_tiers) continue;
        for (let tier of skill_tiers) {
          let expansion: string = 'CLSC';
          Array.from(ExpansionTicker.entries()).some(([k, v]) => {
            tier.name.en_GB.includes(k) ? (expansion = v) : '';
          });
          const { categories } = await this.BNet.query(`/data/wow/profession/${profession.id}/skill-tier/${tier.id}`, {
            timeout: 10000,
            headers: { 'Battlenet-Namespace': 'static-eu' }
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
                  accessToken: key.token
                }, { jobId: `${recipe.id}` }
              )
            }
          }
        }
      }

    } catch (e) {
      this.logger.error(`indexPricing: ${e}`)
    }
  }
}
