import { InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { BullQueueInject, BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { Job, Queue } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Gold, Item, Key, Pricing, Realm, Token, Valuations } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import { ItemPricing } from '@app/mongo/schemas/pricing.schema';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { delay } from '@app/core/utils/converters';
import {
  FLAG_TYPE,
  GLOBAL_DMA_KEY,
  itemsQueue,
  IVAItem,
  IQItemValuation,
  IMarketData,
  MethodEvaluation,
  PRICING_TYPE,
  IReagentItem,
  round2,
  VALUATION_TYPE,
  valuationsQueue,
  IQItem,
} from '@app/core';


@BullWorker({ queueName: valuationsQueue.name })
export class ValuationsWorker {
  private readonly logger = new Logger(
    ValuationsWorker.name, { timestamp: true },
  );

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
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
    private readonly queueValuations: Queue<IQItemValuation, number>,
    @BullQueueInject(itemsQueue.name)
    private readonly queueItems: Queue<IQItem, number>,
  ) {}

  @BullWorkerProcess(valuationsQueue.workerOptions)
  public async process(job: Job<IQItemValuation, number>): Promise<number> {
    try {
      const item = await this.ItemModel.findById(job.data._id).lean();

      if (!item) {
        this.logger.error(`ValuationsWorker: item: ${job.data._id} not found`);
        return 404;
      }

      const itemVA: IVAItem = { ...item, ...job.data };

      if (itemVA.iteration > 50) {
        this.logger.error(`item: ${item._id} iteration > ${itemVA.iteration}`);
        return 403;
      }

      await job.updateProgress(5);

      await this.getCVA(itemVA);
      await job.updateProgress(20);

      await this.getVVA(itemVA);
      await job.updateProgress(40);

      await this.getTVA(itemVA);
      await job.updateProgress(60);

      await this.getAVA(itemVA);
      await job.updateProgress(80);

      await this.getPMVA(itemVA);
      await job.updateProgress(100);

      return 200;
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`${ValuationsWorker.name}: ${errorException}`);
      return 500;
    }
  }

  private checkAssetClass(item_id: number, asset_class: LeanDocument<String>[], check: VALUATION_TYPE) {
    if (!asset_class.includes(check)) {
      throw new InternalServerErrorException(`item: ${item_id} asset_class not ${check}`);
    }
  }

  private async checkDerivativeItems(
    derivatives: ItemPricing[],
  ) {
    await lastValueFrom(
      from(derivatives).pipe(
        mergeMap(async (derivative) => {
          const derivativeItem = await this.ItemModel.findById(derivative._id).lean();
          if (!derivativeItem) await this.addMissingItemToQueue(derivativeItem._id);
          this.checkAssetClass(derivativeItem._id, derivativeItem.asset_class, VALUATION_TYPE.MARKET);
        }, 8),
      ),
    );
  }

  private async checkReagentItems(
    reagents: ItemPricing[],
    derivative_id: number,
    last_modified: number,
    connected_realm_id: number,
  ) {
    try {
      /**
       * Check that every reagent item is exists
       * && it has CTD pricing
       */
      await lastValueFrom(
        from(reagents).pipe(
          mergeMap(async (reagent) => {
            const reagentItem = await this.ItemModel.findById(reagent._id).lean();
            if (!reagentItem) await this.addMissingItemToQueue(reagent._id);

            if (!reagentItem.asset_class.includes(VALUATION_TYPE.PREMIUM)) {
              const ctdItem = await this.ValuationsModel
                .findOne({
                  item_id: reagentItem._id,
                  last_modified: last_modified,
                  connected_realm_id: connected_realm_id,
                  flag: FLAG_TYPE.B,
                })
                .sort({ value: 1 })
                .lean();

              if (!ctdItem) {
                await this.addValuationToQueue({
                  _id: reagentItem._id,
                  last_modified: last_modified,
                  connected_realm_id: connected_realm_id,
                  iteration: 0,
                });
              }
            }
          }, 8),
        ),
      );

      await delay(1.5);
    } catch (errorException) {
      this.logger.error(`checkReagentItems: derivative ${derivative_id} error`);
    }
  }

  private async addMissingItemToQueue(_id: number): Promise<void> {
    this.logger.warn(`getDVA: item ${_id} (reagent) not found`);
    const key = await this.KeyModel.findOne({ tags: GLOBAL_DMA_KEY });

    if (!key || !key.token) {
      this.logger.error(`indexItems: clearance: ${GLOBAL_DMA_KEY} key not found`);
      return;
    }

    await this.queueItems.add(
      `${_id}`,
      {
        _id: _id,
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token,
      },
      {
        jobId: `${_id}`,
      },
    );
  }

  private async addValuationToQueue(args: IQItemValuation): Promise<void> {
    const jobId = `${args._id}@${args.connected_realm_id}:${args.last_modified}}`;
    const jobRemove: number = await this.queueValuations.remove(jobId);

    this.logger.warn(`addValuationToQueue: ${jobId}, remove job: ${jobRemove}`);

    await this.queueValuations.add(
      jobId,
      {
        _id: args._id,
        last_modified: args.last_modified,
        connected_realm_id: args.connected_realm_id,
        iteration: args.iteration + 1,
      },
      {
        jobId,
        priority: 0,
      },
    );
  }

  private async getCVA <T extends IVAItem>(args: T): Promise<void> {
    try {
      this.checkAssetClass(args._id, args.asset_class, VALUATION_TYPE.GOLD);
      /** Request timestamp for gold */
      const ts = await this.RealmModel
        .findOne({ connected_realm_id: args.connected_realm_id })
        .select('auctions golds')
        .lean();

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
          },
        });
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
          },
        });
      }
    } catch (errorException) {
      this.logger.error(`getCVA: item ${args._id}, ${errorException}`);
    }
  }

  private async getVVA <T extends IVAItem>(args: T): Promise<void> {
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
    } catch (errorException) {
      this.logger.error(`getVVA: item ${args._id}, ${errorException}`);
    }
  }

  private async getTVA <T extends IVAItem>(args: T): Promise<void> {
    try {
      this.checkAssetClass(args._id, args.asset_class, VALUATION_TYPE.WOWTOKEN);
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
                    },
                  );
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
    } catch (errorException) {
      this.logger.error(`getTVA: item ${args._id}, ${errorException}`);
    }
  }

  private async getAVA <T extends IVAItem>(args: T): Promise<void> {
    try {
      this.checkAssetClass(args._id, args.asset_class, VALUATION_TYPE.MARKET);

      const ava = await this.ValuationsModel.findOne({
        item_id: args._id,
        last_modified: args.last_modified,
        connected_realm_id: args.connected_realm_id,
        type: VALUATION_TYPE.MARKET,
      });

      if (!ava) {
        /** Request for Quotes */
        const [market_data] = await this.AuctionsModel.aggregate<IMarketData>([
          {
            $match: {
              connected_realm_id: args.connected_realm_id,
              item_id: args._id,
              last_modified: args.last_modified,
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
        ]);

        if (!market_data) {
          this.logger.error(`getAVA: item ${args._id}, marker data not found`);
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
              orders: market_data.orders,
            },
          });
        }

      }
    } catch (errorException) {
      this.logger.error(`getAVA: item ${args._id}, ${errorException}`);
    }
  }

  private async getPMVA(args: IVAItem): Promise<void> {
    try {
      this.checkAssetClass(args._id, args.asset_class, VALUATION_TYPE.DERIVATIVE);

      const primary_methods = await this.PricingModel
        .find({
          'derivatives._id': args._id,
          type: { $ne: PRICING_TYPE.REVIEW },
        })
        .lean();

      if (primary_methods.length === 0) {
        this.logger.warn(`getPMVA: item ${args._id}, ${primary_methods.length} pricing methods found`);
        return;
      }
      /**
       * Iterating every pricing method
       * if reagents exists
       * if derivatives exist
       * and iterate them one-by-one
       */
      for (const price_method of primary_methods) {

        if (
          price_method.reagents.length === 0
          || price_method.derivatives.length === 0
        ) {
          this.logger.warn(`getPMVA: item ${args._id} pricing method: ${price_method._id} reagents: ${price_method.reagents.length} derivatives: ${price_method.derivatives.length}`);
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
          type: VALUATION_TYPE.DERIVATIVE,
          name: price_method._id.toString(),
        });

        if (dva) {
          this.logger.warn(`getPMVA: item ${args._id} pricing method: ${price_method._id} already have valuation`);
          continue;
        }

        const sumReagentsQuantity: number = price_method.reagents.reduce((accum, reagent ) => accum + reagent.quantity, 0);
        const sumDerivativesQuantity: number = price_method.derivatives.reduce((accum, derivative ) => accum + derivative.quantity, 0);
        const singleDerivative: boolean = price_method.derivatives.length === 1;
        const singleReagent: boolean = price_method.reagents.length === 1;

        const methodEvaluation: MethodEvaluation = {
          queue_cost: 0,
          derivatives_cost: 0,
          premium: 0,
          nominal_value: 0,
          nominal_value_draft: 0,
          reagent_quantity_sum: sumReagentsQuantity,
          derivative_quantity_sum: sumDerivativesQuantity,
          premium_items: [],
          reagent_items: [],
          unsorted_items: [],
          single_derivative: singleDerivative,
          single_reagent: singleReagent,
          single_premium: false,
          premium_clearance: true,
        };

        /**
         * Check every reagent item existence
         * and non-premium ctd methods
         */
        await this.checkReagentItems(
          price_method.reagents,
          args._id,
          args.last_modified,
          args.connected_realm_id,
        );
        /**
         * Evaluate every reagent
         * in pricing one by one
         */
        const meRVA = await this.getRVA(args, price_method, methodEvaluation);
        Object.assign(methodEvaluation, meRVA);
        /**
         * Premium Reagent Valuation Adjustment
         *
         * Only for premium_items
         * and single_derivative
         */
        const mePRVA = await this.getPRVA(args, price_method, methodEvaluation);
        Object.assign(methodEvaluation, mePRVA);
        /**
         * getDVA allows us to evaluate single or
         * multiple derivatives based on methodEvaluation
         */
        await this.getDVA(args, price_method, methodEvaluation);
      }
      /** End of loop for every pricing method */
    } catch (errorException) {
      this.logger.error(`getPMVA: item ${args._id}, ${errorException}`);
    }
  }

  private async getRVA(
    args: IVAItem,
    price_method: LeanDocument<Pricing>,
    methodEvaluation: MethodEvaluation,
  ): Promise<MethodEvaluation> {
    try {
      for (const reagent of price_method.reagents) {
        const item = await this.ItemModel.findById(reagent._id).lean();
        if (!item) {
          await this.addMissingItemToQueue(reagent._id);
          await this.addValuationToQueue({
            _id: args._id,
            last_modified: args.last_modified,
            connected_realm_id: args.connected_realm_id,
            iteration: args.iteration,
          });
          throw new ServiceUnavailableException(`getRVA: ${args._id} recursive`);
        }

        const reagentItem: IReagentItem = Object.assign(
          { quantity: reagent.quantity, value: 0 },
          item,
        );

        if (reagentItem.asset_class.includes(VALUATION_TYPE.PREMIUM)) {
          /**
           * Add to PREMIUM for later analysis
           *
           * If premium item is also derivative, like EXPL
           * place them as start of premium_items[]
           * it allow us evaluate more then one premiums
           * in one pricing method
           */
          if (reagentItem.asset_class.includes(VALUATION_TYPE.DERIVATIVE)) {
            methodEvaluation.premium_items.unshift(reagentItem);
          } else {
            methodEvaluation.premium_items.push(reagentItem);
          }
          /** We add PREMIUM to reagent_items */
          methodEvaluation.reagent_items.push(reagentItem);
        } else {
          /** Find cheapest to delivery method for item on current timestamp */
          const ctdValuation = await this.ValuationsModel
            .findOne({
              item_id: reagentItem._id,
              last_modified: args.last_modified,
              connected_realm_id: args.connected_realm_id,
              flag: FLAG_TYPE.B,
            })
            .sort({ value: 1 })
            .lean();

          /**
           * If CTD not found..
           * stop evaluation, start recursive?
           */
          if (!ctdValuation) {
            await this.checkReagentItems(price_method.reagents, args._id, args.last_modified, args.connected_realm_id);
            await this.addValuationToQueue({
              _id: args._id,
              last_modified: args.last_modified,
              connected_realm_id: args.connected_realm_id,
              iteration: args.iteration,
            });
            throw new ServiceUnavailableException(`getRVA: ${args._id} recursive`);
          }

          if (
            ctdValuation.type === VALUATION_TYPE.DERIVATIVE
            && ctdValuation.details
          ) {
            for (const underlyingItem of ctdValuation.details.reagent_items) {
              /** Queue_quantity x Underlying_item.quantity */
              const underlyingReagentItemValue = round2(underlyingItem.value * reagentItem.quantity);
              const underlyingReagentItemQuantity = underlyingItem.quantity * reagentItem.quantity;
              /** if this item is already in reagent_items, then + quantity */
              if (methodEvaluation.reagent_items.some(reagent_item => reagent_item._id === underlyingItem._id)) {
                /** take in focus by arrayIndex and edit properties */
                const reagentItemIndex = methodEvaluation.reagent_items.findIndex(item => item._id === underlyingItem._id);
                if (reagentItemIndex !== -1) {
                  methodEvaluation.reagent_items[reagentItemIndex].value += underlyingReagentItemValue;
                  methodEvaluation.reagent_items[reagentItemIndex].quantity += underlyingReagentItemQuantity;
                }
              } else {
                methodEvaluation.reagent_items.push(underlyingItem);
              }
            }
          } else {
            reagentItem.value = round2(ctdValuation.value * reagentItem.quantity);
            methodEvaluation.reagent_items.push(reagentItem);
          }

          /** We add value to queue_cost */
          methodEvaluation.queue_cost += round2(ctdValuation.value * reagentItem.quantity);
        }
      }

      return methodEvaluation;
    } catch (errorException) {
      this.logger.error(`getRVA: ${errorException}`);
    }
  }

  private async getPRVA(
    args: IVAItem,
    price_method: LeanDocument<Pricing>,
    methodEvaluation: MethodEvaluation,
  ): Promise<MethodEvaluation> {
    try {

      if (methodEvaluation.premium_items.length && methodEvaluation.single_derivative) {
        this.logger.log(`getPRVA: single_derivative ${methodEvaluation.single_derivative}`);
        /** Pre-valuate nominal value w/o premium part */
        const [firstPremiumItem] = methodEvaluation.premium_items;
        methodEvaluation.nominal_value = round2(methodEvaluation.queue_cost / firstPremiumItem.quantity);

        /** Request market price from method item_id */
        const ava = await this.ValuationsModel.findOne({
          item_id: args._id,
          last_modified: args.last_modified,
          connected_realm_id: args.connected_realm_id,
          type: VALUATION_TYPE.MARKET,
          flag: FLAG_TYPE.S,
        });

        /** Single Premium Flag */
        methodEvaluation.single_premium = methodEvaluation.premium_items.length === 1;
        this.logger.log(`single_premium: ${methodEvaluation.single_premium}`);

        /** If ava.exists and premium_items is one */
        if (methodEvaluation.single_premium && ava) {
          methodEvaluation.premium = round2(ava.value - methodEvaluation.queue_cost);
        }

        for (const premium_item of methodEvaluation.premium_items) {
          /** Single Name Valuation */
          if (methodEvaluation.single_premium) {
            await this.PricingModel.findByIdAndUpdate(price_method._id, { single_premium: premium_item._id });
            const prva = await this.ValuationsModel.findOne({
              item_id: premium_item._id,
              last_modified: args.last_modified,
              connected_realm_id: args.connected_realm_id,
              type: VALUATION_TYPE.PREMIUM,
            }).sort({ 'details.wi': -1 });

            if (prva) {
              methodEvaluation.queue_cost += round2(prva.value * premium_item.quantity);
            } else {
              methodEvaluation.unsorted_items.push(premium_item);
            }
          }

          if (premium_item.asset_class.includes(VALUATION_TYPE.DERIVATIVE)) {
            /**
             * Find cheapest to delivery
             * for premium_item on current timestamp
             */
            const ctdValuation = await this.ValuationsModel.findOne({
              item_id: premium_item._id,
              last_modified: args.last_modified,
              connected_realm_id: args.connected_realm_id,
              type: VALUATION_TYPE.DERIVATIVE,
            }).sort({ value: 1 });

            if (!ctdValuation) {
              await this.addValuationToQueue({
                _id: premium_item._id,
                last_modified: args.last_modified,
                connected_realm_id: args.connected_realm_id,
                iteration: args.iteration + 1,
              });
              methodEvaluation.unsorted_items.push(premium_item);
              continue;
            }

            methodEvaluation.queue_cost += round2(ctdValuation.value * premium_item.quantity);

          } else {
            /**
             * CTD FOR PREMIUM
             *
             * When we are first time here, the premium is still clear
             * require additional research
             */
            if (methodEvaluation.premium_clearance && ava) {
              methodEvaluation.premium = round2(ava.value - methodEvaluation.queue_cost);
              methodEvaluation.premium_clearance = false;
            }

            const prva = await this.ValuationsModel.findOne({
              item_id: premium_item._id,
              last_modified: args.last_modified,
              connected_realm_id: args.connected_realm_id,
              type: VALUATION_TYPE.PREMIUM,
            }).sort({ 'details.wi': -1 });

            if (prva) {
              methodEvaluation.queue_cost += round2(prva.value * premium_item.quantity);
            } else {
              methodEvaluation.unsorted_items.push(premium_item);
            }
          }
        }
      }

      return methodEvaluation;
    } catch (errorException) {
      this.logger.error(`getPRVA: ${errorException}`);
    }
  }

  private async getDVA(
    args: IVAItem,
    price_method: LeanDocument<Pricing>,
    methodEvaluation: MethodEvaluation,
  ): Promise<MethodEvaluation> {
    try {

      /**
       * POST-REAGENT, pricing method type reverse
       * && derivative length > 1 && reagent = 1
       */
      if (
        price_method.type === PRICING_TYPE.REVERSE
        && methodEvaluation.single_derivative === false
        && methodEvaluation.single_reagent === true
      ) {
        this.logger.log(`getDVA: single_reagent ${methodEvaluation.single_reagent}`);

        const [reagentItem] = methodEvaluation.reagent_items;

        for (const derivative of price_method.derivatives) {
          //`DR:${derivative._id}:${price_method.spell_id}:${reagentItem._id}`
          const derivativeItemName = price_method._id.toString();
          const derivativeItemShare = round2(derivative.quantity / methodEvaluation.derivative_quantity_sum);
          const derivativeValuationShare = round2(methodEvaluation.queue_cost * derivativeItemShare);
          const derivativeItemValuation = derivative.quantity < 1
            ? round2((1 / derivative.quantity) * derivativeValuationShare)
            : round2(derivativeValuationShare / derivative.quantity);

          const dva = await this.ValuationsModel.findOne({
            item_id: args._id,
            last_modified: args.last_modified,
            connected_realm_id: args.connected_realm_id,
            type: VALUATION_TYPE.DERIVATIVE,
            name: derivativeItemName,
          });

          if (!dva) {
            await this.ValuationsModel.create({
              name: derivativeItemName,
              flag: FLAG_TYPE.B,
              type: VALUATION_TYPE.DERIVATIVE,
              item_id: derivative._id,
              connected_realm_id: args.connected_realm_id,
              last_modified: args.last_modified,
              value: derivativeItemValuation,
              details: {
                queue_cost: round2(methodEvaluation.queue_cost),
                queue_quantity: derivative.quantity,
                rank: price_method.rank,
                reagent_items: methodEvaluation.reagent_items,
                premium_items: methodEvaluation.premium_items,
                unsorted_items: methodEvaluation.unsorted_items,
              },
            });
          }
        }
      }

      if (
        price_method.type === PRICING_TYPE.PRIMARY
        && methodEvaluation.single_derivative === true
      ) {
        const [singleDerivative] = price_method.derivatives;
        // `DP:${singleDerivative._id}:${price_method.spell_id}`
        const derivativeItemName = price_method._id.toString();
        methodEvaluation.nominal_value = round2(methodEvaluation.queue_cost / singleDerivative.quantity);

        // TODO proc chance
        if (
          price_method.expansion === 'BFA' &&
          price_method.profession === 'ALCH' &&
          price_method.rank === 3
        ) {
          methodEvaluation.nominal_value = round2(methodEvaluation.nominal_value * 0.6);
        }

        await this.ValuationsModel.create({
          name: derivativeItemName,
          flag: FLAG_TYPE.B,
          type: VALUATION_TYPE.DERIVATIVE,
          item_id: args._id,
          connected_realm_id: args.connected_realm_id,
          last_modified: args.last_modified,
          value: methodEvaluation.nominal_value,
          details: {
            queue_cost: round2(methodEvaluation.queue_cost),
            queue_quantity: singleDerivative.quantity,
            rank: price_method.rank,
            reagent_items: methodEvaluation.reagent_items,
            premium_items: methodEvaluation.premium_items,
            unsorted_items: methodEvaluation.unsorted_items,
          },
        });
      }

      return methodEvaluation;
    } catch (errorException) {
      this.logger.error(`getDVA: ${errorException}`);
    }
  }
}
