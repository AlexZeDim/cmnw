import { Logger } from '@nestjs/common';
import { BullQueueInject, BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { FLAG_TYPE, PRICING_TYPE, round2, VALUATION_TYPE, valuationsQueue } from '@app/core';
import { Job, Queue } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Gold, Item, Pricing, Realm, Token, Valuations } from '@app/mongo';
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

interface MarketData {
  _id: number,
  quantity: number,
  open_interest: number,
  value: number,
  min: number,
  orders: number[]
}

interface MethodEvaluation {
  queue_cost: number,
  derivatives_cost: number,
  premium: number,
  nominal_value: number,
  nominal_value_draft: number,
  q_reagents_sum: number,
  q_derivatives_sum: number,
  premium_items: any[],
  reagent_items: any[],
  unsorted_items: any[],
  single_derivative: boolean,
  single_reagent: boolean,
  single_premium: boolean,
  premium_clearance: boolean
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
    @InjectModel(Auction.name)
    private readonly AuctionsModel: Model<Auction>,
    @InjectModel(Pricing.name)
    private readonly PricingModel: Model<Pricing>,
    @InjectModel(Gold.name)
    private readonly GoldModel: Model<Gold>,
    @InjectModel(Item.name)
    private readonly ItemModel: Model<Item>,
    @BullQueueInject(valuationsQueue.name)
    private readonly queue: Queue,
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
      if (!args.asset_class.includes(VALUATION_TYPE.MARKET)) {
        this.logger.error(`getCVA: item ${args._id} asset class not ${VALUATION_TYPE.MARKET}`);
        return;
      }
      const ava = await this.ValuationsModel.findOne({
        item_id: args._id,
        last_modified: args.last_modified,
        connected_realm_id: args.connected_realm_id,
        type: VALUATION_TYPE.MARKET,
      });
      if (!ava) {
        /** Request for Quotes */
        const [market_data]: MarketData[] = await this.AuctionsModel.aggregate([
          {
            $match: {
              'last_modified': args.last_modified,
              'item_id': args._id,
              'connected_realm_id': args.connected_realm_id,
            },
          },
          {
            $project: {
              _id: '$last_modified',
              id: '$id',
              quantity: '$quantity',
              price: {
                $ifNull: ['$buyout', { $ifNull: ['$bid', '$price'] }],
              },
            },
          },
          {
            $group: {
              _id: '$_id',
              quantity: { $sum: '$quantity' },
              open_interest: {
                $sum: { $multiply: ['$price', '$quantity'] },
              },
              value: {
                $min: {
                  $cond: [
                    { $gte: ['$quantity', (args.stackable || 1)] }, '$price', { $min: '$price' },
                  ],
                },
              },
              min: { $min: '$price' },
              orders: { $addToSet: '$id' },
            },
          },
        ]).exec();
        if (!market_data) {
          this.logger.error(`getAVA: item ${args._id}, marker data not found`)
          return;
        }
        /** Initiate constants */
        const flags = ['BUY', 'SELL'];
        for (let flag of flags) {
          const value: number = flag === FLAG_TYPE.S ? round2(market_data.value * 0.95) : round2(market_data.value);
          const min_price: number = flag === FLAG_TYPE.S ? round2(market_data.min * 0.95) : round2(market_data.min);
          await this.ValuationsModel.create({
            name: `AUCTION ${flag}`,
            flag: flag,
            item_id: args._id,
            connected_realm_id: args.connected_realm_id,
            type: VALUATION_TYPE.MARKET,
            last_modified: args.last_modified,
            value: value,
            details: {
              min_price: min_price,
              quantity: market_data.quantity,
              open_interest: Math.round(market_data.open_interest),
              orders: market_data.orders
            }
          });
        }
      }
    } catch (e) {
      this.logger.error(`getAVA: item ${args._id}, ${e}`)
    }
  }

  private async geDVA <T extends ItemValuationProps>(args: T): Promise<void> {
    try {
      if (!args.asset_class.includes(VALUATION_TYPE.DERIVATIVE)) {
        this.logger.error(`geDVA: item ${args._id} asset class not ${VALUATION_TYPE.DERIVATIVE}`);
        return;
      }
      const primary_methods = await this.PricingModel.find({ 'derivatives._id': args._id, type: { $ne: PRICING_TYPE.REVIEW } })
      if (!primary_methods.length) {
        this.logger.warn(`geDVA: item ${args._id}, ${primary_methods.length} pricing methods found`)
        return;
      }
      /**
       * Iterating every pricing method
       * if reagents exists
       * if derivatives exist
       * and iterate them one-by-one
       */
      for (const price_method of primary_methods) {
        if (!price_method.reagents.length || !price_method.derivatives.length) {
          this.logger.warn(`getDVA: item ${args._id} pricing method: ${price_method._id} reagents: ${price_method.reagents.length} derivatives: ${price_method.derivatives.length}`)
          continue;
        }
        /**
         * Check DVA on current timestamp
         * and if newDVA create constructor
         */
        const dva = await this.ValuationsModel.findOne({
          item_id: args._id,
          last_modified: args.last_modified,
          connected_realm_id: args.connected_realm_id,
          name: `${price_method.ticker}`,
          type: VALUATION_TYPE.DERIVATIVE,
        });

        if (dva) continue;

        const q_reagents_sum: number = price_method.reagents.reduce((accum, reagent ) => accum + reagent.quantity, 0);
        const q_derivatives_sum: number = price_method.derivatives.reduce((accum, derivative ) => accum + derivative.quantity, 0);
        const single_derivative: boolean = price_method.derivatives.length <= 1;
        const single_reagent: boolean = price_method.reagents.length === 1;

        const method_evaluations: MethodEvaluation = {
          queue_cost: 0,
          derivatives_cost: 0,
          premium: 0,
          nominal_value: 0,
          nominal_value_draft: 0,
          q_reagents_sum,
          q_derivatives_sum,
          premium_items: [],
          reagent_items: [],
          unsorted_items: [],
          single_derivative,
          single_reagent,
          single_premium: false,
          premium_clearance: true
        }
        /**
         * Evaluate every reagent
         * in pricing one by one
         */
        for (const reagent of price_method.reagents) {
          const item = await this.ItemModel.findById(reagent._id).lean();
          if (!item) {
            this.logger.warn(`getDVA: item ${reagent._id} (reagent) not found`);
            // TODO add item to request to queue?
            continue;
          }
          const reagent_item = { ...reagent, ...item, ...{ value: 0 } };
          /**
           * Add to PREMIUM for later analysis
           *
           * If premium item is also derivative, like EXPL
           * place them as start of premium_items[]
           * it allow us evaluate more then one premiums
           * in one pricing method
           */
          if (reagent_item.asset_class.includes(VALUATION_TYPE.PREMIUM)) {
            if (reagent_item.asset_class.includes(VALUATION_TYPE.DERIVATIVE)) {
              method_evaluations.premium_items.unshift(reagent_item);
            } else {
              method_evaluations.premium_items.push(reagent_item);
            }
            /** We add PREMIUM to reagent_items */
            method_evaluations.reagent_items.push(reagent_item);
          } else {
            /** Find cheapest to delivery method for item on current timestamp */
            const ctd = await this.ValuationsModel
              .findOne({
                item_id: reagent_item._id,
                last_modified: args.last_modified,
                connected_realm_id: args.connected_realm_id,
                flag: FLAG_TYPE.B,
              })
              .sort({ value: 1 })
              .lean();
            /**
             * If CTD not found..
             * TODO probably add to Q & return
             */
            if (!ctd) {
              await this.queue.add();
              // TODO re add original?
              return;
            }
            /**
             * If CTD is derivative type,
             * replace original reagent_item
             * with underlying reagent_items
             */
            if (ctd.type === VALUATION_TYPE.DERIVATIVE && ctd.details) {
              for (const underlying_item of ctd.details.reagent_items) {
                /** Queue_quantity x Underlying_item.quantity */
                underlying_item.value = round2(underlying_item.value * reagent_item.quantity);
                underlying_item.quantity = underlying_item.quantity * reagent_item.quantity;
                /** if this item is already in reagent_items, then + quantity */
                if (method_evaluations.reagent_items.some(ri => ri._id === underlying_item._id)) {
                  /** take in focus by arrayIndex and edit properties */
                  const riIndex = method_evaluations.reagent_items.findIndex(item => item._id === underlying_item._id);
                  if (riIndex !== -1) {
                    method_evaluations.reagent_items[riIndex].value += underlying_item.value;
                    method_evaluations.reagent_items[riIndex].quantity += underlying_item.quantity;
                  }
                } else {
                  method_evaluations.reagent_items.push(underlying_item);
                }
              }
            } else {
              reagent_item.value = round2(ctd.value * reagent_item.quantity);
              method_evaluations.reagent_items.push(reagent_item);
            }
            /** We add value to queue_cost */
            method_evaluations.queue_cost += round2(ctd.value * reagent_item.quantity);
          }
        }
        /** End of loop for every reagent_item */
        // TODO PRVA
        /**
         * Premium Reagent Valuation Adjustment
         *
         * Only for premium_items
         * and single_derivative
         */
        if (method_evaluations.premium_items.length && method_evaluations.single_derivative) {
          /** Pre-valuate nominal value w/o premium part */
          const [firstPremiumItem] = price_method.derivatives;
          method_evaluations.nominal_value_draft = round2(method_evaluations.queue_cost / firstPremiumItem.quantity);
          method_evaluations.nominal_value = method_evaluations.nominal_value_draft;
          /** Request market price from method item_id */
          const ava = await this.ValuationsModel.findOne({
            item_id: args._id,
            last_modified: args.last_modified,
            connected_realm_id: args.connected_realm_id,
            type: VALUATION_TYPE.MARKET,
            flag: FLAG_TYPE.S,
          });
          method_evaluations.single_premium = method_evaluations.premium_items.length === 1;
          /** If ava.exists and premium_items is one */
          if (method_evaluations.single_premium && ava) {
            method_evaluations.single_premium = true;
            method_evaluations.premium = round2(ava.value - method_evaluations.queue_cost);
          }

          for (const premium_item of method_evaluations.premium_items) {
            /** Single Name Valuation */
            if (method_evaluations.single_premium) {
              /** Update existing method as a single name */
              await this.PricingModel.findByIdAndUpdate(price_method._id, { single_premium: premium_item._id });
              const prva = await this.ValuationsModel.findOne({
                item_id: premium_item._id,
                last_modified: args.last_modified,
                connected_realm_id: args.connected_realm_id,
                type: VALUATION_TYPE.PREMIUM,
              });
              if (!prva) {
                await this.ValuationsModel.create({
                  ticker: `${price_method.ticker}`,
                  flag: FLAG_TYPE.S,
                  item_id: premium_item._id,
                  connected_realm_id: args.connected_realm_id,
                  type: VALUATION_TYPE.PREMIUM,
                  last_modified: args.last_modified,
                  value: round2(method_evaluations.premium / premium_item.quantity),
                  details: {
                    wi: round2(premium_item.quantity / firstPremiumItem.quantity * ava.details.quantity,)
                  },
                });
              }
            }

            if (premium_item.asset_class.includes(VALUATION_TYPE.DERIVATIVE)) {
              /**
               * Find cheapest to delivery
               * for premium_item on current timestamp
               * TODO continue PRVA
               */

            } else {
              /**
               * CTD FOR PREMIUM
               *
               * When we are first time here, the premium is still clear
               * require additional research
               * TODO continue PRVA
               */
            }
          }
        }
      }
      /** End of loop for every pricing method */
    } catch (e) {
      this.logger.error(`getDVA: item ${args._id}, ${e}`)
    }
  }
}
