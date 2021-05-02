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
      if (!args.asset_class.includes(VALUATION_TYPE.GOLD)) {
        this.logger.error(`getCVA: item ${args._id} asset class not ${VALUATION_TYPE.GOLD}`);
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
      if (args.asset_class.includes(VALUATION_TYPE.VENDOR)) {
        const vendor = await this.ValuationsModel.findOne({
          item_id: args._id,
          last_modified: args.last_modified,
          connected_realm_id: args.connected_realm_id,
          name: 'VENDOR BUY',
        });
        if (!vendor && args.purchase_price) {
          await this.ValuationsModel.create({
            name: 'VENDOR BUY',
            flag: FLAG_TYPE.B,
            item_id: args._id,
            connected_realm_id: args.connected_realm_id,
            type: VALUATION_TYPE.VENDOR,
            last_modified: args.last_modified,
            value: args.purchase_price,
          });
        }
      }
      if (args.asset_class.includes(VALUATION_TYPE.VSP)) {
        const vsp = await this.ValuationsModel.findOne({
          item_id: args._id,
          last_modified: args.last_modified,
          connected_realm_id: args.connected_realm_id,
          name: 'VENDOR SELL',
        });
        if (!vsp && args.sell_price) {
          await this.ValuationsModel.create({
            name: 'VENDOR SELL',
            flag: FLAG_TYPE.S,
            item_id: args._id,
            connected_realm_id: args.connected_realm_id,
            type: VALUATION_TYPE.VSP,
            last_modified: args.last_modified,
            value: args.sell_price,
          });
        }
      }
    } catch (e) {
      this.logger.error(`getVVA: item ${args._id}, ${e}`)
    }
  }

  private async getTVA <T extends ItemValuationProps>(args: T): Promise<void> {
    try {
      if (!args.asset_class.includes(VALUATION_TYPE.WOWTOKEN)) {
        this.logger.error(`getTVA: item ${args._id} asset class not ${VALUATION_TYPE.WOWTOKEN}`);
        return;
      }
      /** CONSTANT AMOUNT */
      const wtConst = [
        {
          flag: FLAG_TYPE.FLOAT,
          wt_value: 550,
          currency: 'RUB',
        },
        {
          flag: FLAG_TYPE.FIX,
          wt_value: 1400,
          currency: 'RUB',
        },
      ];
      /** PAY CURRENCY RECEIVE GOLD */
      if (args._id === 122270) {
        /** Check actual pricing for PAY FIX / RECEIVE FLOAT */
        const wt = await this.ValuationsModel.findOne({
          item_id: args._id,
          last_modified: args.last_modified,
        });
        if (wt) {
          this.logger.warn(`getTVA: wowtoken ${args._id} valuation already exists`);
          return;
        }
        /** Check if pricing exists at all */
        const wtExt = await this.ValuationsModel.find({ item_id: args._id });
        if (wtExt.length) {
          /** If yes, updated all the CONST values */
          await this.ValuationsModel.updateMany(
            { item_id: args._id },
            { last_modified: args.last_modified },
          );
        } else {
          await this.RealmModel
            .find({ locale: 'en_GB' })
            .cursor()
            .eachAsync(async (realm: Realm) => {
              for (const { flag, currency, wt_value } of wtConst) {
                if (flag === FLAG_TYPE.FIX) {
                  await this.ValuationsModel.create(
                    {
                      name: `PAY FIX ${currency} / RECEIVE FLOAT GOLD`,
                      flag: flag,
                      item_id: args._id,
                      connected_realm_id: realm.connected_realm_id,
                      type: VALUATION_TYPE.WOWTOKEN,
                      last_modified: args.last_modified,
                      value: wt_value,
                      details: {
                        quotation: `${currency} per WoWToken`,
                        swap_type: 'PAY FIX / RECEIVE FLOAT',
                        description:
                          'You pay the fixed amount of real-money currency (based on your region) to receive in exchange a WoWToken, which could be converted to gold value of WoWToken, any time further.',
                      },
                    }
                  )
                }
              }
            });
        }
      }

      /** PAY GOLD RECEIVE CURRENCY */
      if (args._id === 122284) {
        /** Check existing pricing for PAY FLOAT / RECEIVE FIX */
        const wtExt = await this.ValuationsModel.findOne({
          item_id: args._id,
          last_modified: args.last_modified,
          connected_realm_id: args.connected_realm_id,
        });
        if (wtExt) {
          this.logger.warn(`getTVA: wowtoken ${args._id} valuation already exists`);
          return;
        }
        /** Request existing WT price */
        const wtPrice = await this.TokenModel
          .findOne({ region: 'eu' })
          .sort({ _id: -1 });
        if (!wtPrice) {
          this.logger.warn(`getTVA: wowtoken ${args._id} price not found`);
          return;
        }
        for (let { flag, currency, wt_value } of wtConst) {
          if (flag === FLAG_TYPE.FLOAT) {
            await this.ValuationsModel.create({
              name: `PAY FLOAT GOLD / RECEIVE FIX ${currency}`,
              flag: flag,
              item_id: args._id,
              connected_realm_id: args.connected_realm_id,
              type: VALUATION_TYPE.WOWTOKEN,
              last_modified: args.last_modified,
              value: wtPrice.price,
              details: {
                quotation: `gold for FIX ${wt_value} ${currency} or 1m subscription`,
                swap_type: 'PAY FLOAT / RECEIVE FIX',
                description: `You pay always floating (but fixed in a moment of time) amount of gold for fixed payment of ${wt_value} ${currency} or 1m subscription`,
              },
            });
          }
        }
      }
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
