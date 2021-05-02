import { Logger } from '@nestjs/common';
import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { FLAG_TYPE, round2, VALUATION_TYPE, valuationsQueue } from '@app/core';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Gold, Realm, Token, Valuations } from '@app/mongo';
import { Model } from "mongoose";

interface ItemValuationProps {
  _id: number,
  connected_realm_id: number,
  asset_class: string[],
  last_modified: number,
  iteration: number,
  purchase_price?: number,
  sell_price?: number,
  stackable?: number
}

@BullWorker({ queueName: valuationsQueue.name })
export class ValuationsWorker {
  private readonly logger = new Logger(
    ValuationsWorker.name, true,
  );

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Valuations.name)
    private readonly ValuationsModel: Model<Valuations>,
    @InjectModel(Token.name)
    private readonly TokenModel: Model<Token>,
    @InjectModel(Gold.name)
    private readonly GoldModel: Model<Gold>,
  ) {}

  @BullWorkerProcess(valuationsQueue.workerOptions)
  public async process(job: Job): Promise<number> {
    try {
      return 200;
    } catch (e) {
      this.logger.error(`${ValuationsWorker.name}: ${e}`)
      return 500;
    }
  }

  private async getCVA <T extends ItemValuationProps>(args: T): Promise<void> {
    try {

      if (!args.asset_class.includes('GOLD')) {
        this.logger.error(`getCVA: item ${args._id} asset class not GOLD`);
        return;
      }
      /** Request timestamp for gold */
      const ts = await this.RealmModel.findOne({ connected_realm_id: args.connected_realm_id }).select('auctions golds').lean();
      if (!ts) {
        this.logger.error(`getCVA: realm ${args.connected_realm_id} timestamp not found`);
        return;
      }
      /** Check existing pricing */
      const currency = await this.ValuationsModel.findOne({
        item_id: args._id,
        last_modified: ts.auctions,
        connected_realm_id: args.connected_realm_id,
      });
      if (currency) {
        this.logger.warn(`getCVA: item ${args._id} valuation already exists`);
        return;
      }
      /**
       * If pricing not found, get existing the lowest by price document
       * Quantity > 100k+ g
       */
      const goldCTD = await this.GoldModel.findOne({
        connected_realm_id: args.connected_realm_id,
        last_modified: ts.golds,
        quantity: { $gte: 100000 },
      }).sort('price');
      if (!goldCTD) {
        this.logger.warn(`getCVA: item ${args._id} on timestamp: ${ts.golds} ctd not found`);
        return;
      }

      /** Predefined flags, venue, price, etc */
      const flags = ['BUY', 'SELL'];
      const faction: string = goldCTD.faction.toUpperCase();

      /** Evaluate OTC */
      for (const flag of flags) {
        await this.ValuationsModel.create({
          name: `GOLD/RUB ${faction} ${flag} FUNPAY`,
          flag: flag,
          item_id: args._id,
          connected_realm_id: args.connected_realm_id,
          type: flag === FLAG_TYPE.S ? VALUATION_TYPE.OTC : VALUATION_TYPE.FUNPAY,
          last_modified: args.last_modified,
          value: flag === FLAG_TYPE.S ? round2(goldCTD.price * 0.75) : round2(goldCTD.price),
          details: {
            description: flag === FLAG_TYPE.S ? 'Price nominated in RUB for every x1000 gold (lot) and it represents the exact figure that the buyer will pay to the seller in a moment of time, in exchange for x1000 gold (lot) with at least 100 000+ g buy order. Quotes are provided by Funpay.ru — the hugest currency exchange in CIS region.' : 'Price nominated in RUB for every x1000 gold (lot) and it represents the exact figure that the buyer will pay to the seller in a moment of time, in exchange for x1000 gold (lot) with at least 100 000+ g buy order. Quotes are provided by Funpay.ru — the hugest currency exchange in CIS region.',
            quotation: 'RUB per x1000',
            lot_size: 1000,
            minimal_settlement_amount: 100000,
          }
        })
      }

      /** Request WoWToken price */
      const
        wtPrice = await this.TokenModel.findOne({ region: 'eu' }).sort({ _id: -1 }),
        wtExt = await this.ValuationsModel.findOne({
          item_id: args._id,
          last_modified: args.last_modified,
          connected_realm_id: args.connected_realm_id,
          type: VALUATION_TYPE.WOWTOKEN,
        }),
        wtConst = [
          {
            flag: FLAG_TYPE.S,
            wt_value: 550,
            currency: 'RUB',
            description:
              'Represents the price per each x1000 gold, when you are exchanging your gold for Battle.net balance or 1m subscription',
          },
          {
            flag: FLAG_TYPE.B,
            wt_value: 1400,
            currency: 'RUB',
            description:
              'Represents the price per each x1000 gold, when you are buying gold from Blizzard via WoWToken',
          },
        ];

      if (!wtPrice) {
        this.logger.warn(`getCVA: wowtoken data on timestamp: ${args.last_modified} not found`);
        return;
      }

      if (wtExt) {
        this.logger.warn(`getCVA: wowtoken already have a valuation on timestamp: ${args.last_modified} already exists`);
        return;
      }
      /**
       * Currency Valuation Adjustment
       * Check existing price for gold
       * Only if existing price not found
       */
      for (const { flag, wt_value, currency, description } of wtConst) {
        const value: number = parseFloat((wt_value / Math.floor(wtPrice.price / 1000)).toFixed(2));
        await this.ValuationsModel.create({
          name: `GOLD/${currency} ${flag} WOWTOKEN`,
          flag: flag,
          item_id: args._id,
          connected_realm_id: args.connected_realm_id,
          type: VALUATION_TYPE.WOWTOKEN,
          last_modified: args.last_modified,
          value: value,
          details: {
            quotation: `${currency} per x1000`,
            lot_size: 1000,
            minimal_settlement_amount: wtPrice.price,
            description: description,
          }
        })
      }
    } catch (e) {
      this.logger.error(`getCVA: item ${args._id}, ${e}`)
    }
  }

  private async getVVA <T extends ItemValuationProps>(args: T): Promise<void> {
    try {
      // TODO vendor valuation adjustable
    } catch (e) {
      this.logger.error(`getVVA: item ${args._id}, ${e}`)
    }
  }

  private async getTVA <T extends ItemValuationProps>(args: T): Promise<void> {
    try {
      // TODO token valuation adjustable
    } catch (e) {
      this.logger.error(`getTVA: item ${args._id}, ${e}`)
    }
  }

  private async getAVA <T extends ItemValuationProps>(args: T): Promise<void> {
    try {
      // TODO auction valuation adjustable
    } catch (e) {
      this.logger.error(`getAVA: item ${args._id}, ${e}`)
    }
  }

  private async geDVA <T extends ItemValuationProps>(args: T): Promise<void> {
    try {
      // TODO derivative valuation adjustable
    } catch (e) {
      this.logger.error(`getDVA: item ${args._id}, ${e}`)
    }
  }
}
