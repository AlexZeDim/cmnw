/**
 * Model importing
 */

const items_db = require('../../../db/models/items_db');
const valuations = require('../../../db/models/valuations_db');
const auctions_db = require('../../../db/models/auctions_db');
const pricing_methods = require('../../../db/models/pricing_methods_db');
const golds_db = require('../../../db/models/golds_db');
const wowtoken_db = require('../../../db/models/wowtoken_db');
const realms_db = require('../../../db/models/realms_db');

const { Round2 } = require('../../../db/setters');

/**
 *
 * @param _id {number}
 * @param asset_class {[string]}
 * @param connected_realm_id {number}
 * @param quantity {number}
 * @param last_modified {number}
 * @param iterations {number}
 * @param args
 * @returns {Promise<void>}
 */

const evaluate = async function ({ _id, asset_class, connected_realm_id, quantity, last_modified, iterations, ...args}) {
  try {
    if (iterations) iterations += 1;
    if (!_id || !connected_realm_id) return
    if (iterations && iterations > 50) return
    /**
     * If item don't have timestamp
     * we get it from realm
     */
    if (!last_modified) {
      const t = await realms_db.findOne({ connected_realm_id: connected_realm_id }).select('auctions').lean();
      if (t) last_modified = t.auctions;
    }
    /**
     * Gold Valuation Adjustment
     * .asset_class.includes('GOLD')
     */
    if (asset_class.includes('GOLD')) {
      /** Request timestamp for gold */
      let t = await realms_db.findOne({ connected_realm_id: connected_realm_id }).select('auctions golds').lean();
      /** Check existing pricing */
      const currency = await valuations.findOne({
        item_id: _id,
        last_modified: t.auctions,
        connected_realm_id: connected_realm_id,
      }).lean();
      if (currency) return
      /**
       * If pricing not found, get existing the lowest by price document
       * Quantity > 100k+ g
       */
      const ctd_gold = await golds_db.findOne({
        connected_realm_id: connected_realm_id,
        last_modified: t.golds,
        quantity: { $gte: 100000 },
      }).sort('price').lean();
      if (!ctd_gold) return
      /** Predefined flags, venue, price, etc */
      const flags = ['BUY', 'SELL'];
      let venue = 'FUNPAY';
      let price = ctd_gold.price;
      let faction = ctd_gold.faction.toUpperCase();
      let description =
        'Price nominated in RUB for every x1000 gold (lot) and it represents the exact figure that the buyer will pay to the seller in a moment of time, in exchange for x1000 gold (lot) with at least 100 000+ g buy order. Quotes are provided by Funpay.ru — the hugest currency exchange in CIS region.';
      for (let flag of flags) {
        /** Redefine for SELL flag */
        if (flag === 'SELL') {
          price = price * 0.75;
          venue = 'OTC';
          description =
            'Price nominated in RUB for every x1000 gold (lot). It represents the exact amount of RUB that seller will receive in return, after FUNPAY exchange commission. (Near ¬25%). Quotes are provided by Funpay.ru — the hugest currency exchange in CIS region.';
        }
        await valuations.create({
          name: `GOLD/RUB ${faction} ${flag} FUNPAY`,
          flag: flag,
          item_id: _id,
          connected_realm_id: connected_realm_id,
          type: venue,
          last_modified: last_modified,
          value: Round2(price),
          details: {
            quotation: 'RUB per x1000',
            lot_size: 1000,
            minimal_settlement_amount: 100000,
            description: description,
          },
        });
        console.info(`DMA-IVA: ${_id}@${connected_realm_id}, GOLD/RUB ${faction} ${flag} FUNPAY`,);
      }

      /** Request WoWToken price */
      const wt_price = await wowtoken_db.findOne({ region: 'eu' }).sort({ _id: -1 }).lean();
      if (!wt_price) return
      /**
       * Currency Valuation Adjustment
       * Check existing price for gold
       */
      const wt_ext = await valuations.findOne({
        item_id: _id,
        last_modified: last_modified,
        connected_realm_id: connected_realm_id,
        type: 'WOWTOKEN',
      });
      if (wt_ext) return

      /** CONSTANT AMOUNT */
      const wt_const = [
        {
          flag: 'SELL',
          wt_value: '550',
          currency: 'RUB',
          description:
            'Represents the price per each x1000 gold, when you are exchanging your gold for Battle.net balance or 1m subscription',
        },
        {
          flag: 'BUY',
          wt_value: '1400',
          currency: 'RUB',
          description:
            'Represents the price per each x1000 gold, when you are buying gold from Blizzard via WoWToken',
        },
      ];
      /** Only if existing price not found */
      for (const { flag, wt_value, currency, description } of wt_const) {
        await valuations.create({
          name: `GOLD/${currency} ${flag} WOWTOKEN`,
          flag: flag,
          item_id: _id,
          connected_realm_id: connected_realm_id,
          type: 'WOWTOKEN',
          last_modified: last_modified,
          value: parseFloat(
            (wt_value / Math.floor(wt_price.price / 1000)).toFixed(2),
          ),
          details: {
            quotation: `${currency} per x1000`,
            lot_size: 1000,
            minimal_settlement_amount: wt_price.price,
            description: description,
          },
        });
        console.info(`DMA-IVA: ${_id}@${connected_realm_id}, GOLD/${currency} ${flag} WOWTOKEN`);
      }
    }

    if (asset_class.includes('WOWTOKEN')) {
      /** CONSTANT AMOUNT */
      const wt_const = [
        {
          flag: 'PAY FLOAT',
          wt_value: '550',
          currency: 'RUB',
        },
        {
          flag: 'PAY FIX',
          wt_value: '1400',
          currency: 'RUB',
        },
      ];

      /** PAY CURRENCY RECEIVE GOLD */
      if (_id === 122270) {
        /** Check actual pricing for PAY FIX / RECEIVE FLOAT */
        const wt = await valuations.findOne({
          item_id: _id,
          last_modified: last_modified,
        });
        if (wt) return

        /** Check if pricing exists at all */
        const wt_ext = await valuations.find({ item_id: _id });
        if (wt_ext.length) {
          /** If yes, updated all the CONST values */
          await valuations.updateMany(
            { item_id: _id },
            { last_modified: last_modified },
          );
          console.info(`DMA-IVA: ${_id}@${connected_realm_id}, WOWTOKEN BUY`);
        } else {
          /** Initiate the very first pricing predetermined */
          const initial_wt = [];
          await realms_db
            .find({ locale: 'en_GB' })
            .cursor()
            .eachAsync(({ connected_realm_id }) => {
              for (let { flag, currency, wt_value } of wt_const) {
                if (flag === 'PAY FIX') {
                  initial_wt.push({
                    name: `PAY FIX ${currency} / RECEIVE FLOAT GOLD`,
                    flag: flag,
                    item_id: _id,
                    connected_realm_id: connected_realm_id,
                    type: 'WOWTOKEN',
                    last_modified: last_modified,
                    value: wt_value,
                    details: {
                      quotation: `${currency} per WoWToken`,
                      swap_type: 'PAY FIX / RECEIVE FLOAT',
                      description:
                        'You pay the fixed amount of real-money currency (based on your region) to receive in exchange a WoWToken, which could be converted to gold value of WoWToken, any time further.',
                    },
                  });
                  console.info(`DMA-IVA: ${_id}@${connected_realm_id},WOWTOKEN BUY ${currency}`);
                }
              }
            });
          await valuations.insertMany(initial_wt);
          console.info(`DMA-IVA: ${_id}@${connected_realm_id}, INITIAL WOWTOKEN`);
        }
      }

      /** PAY GOLD RECEIVE CURRENCY */
      if (_id === 122284) {
        /** Check existing pricing for PAY FLOAT / RECEIVE FIX */
        const wt_ext = await valuations.findOne({
          item_id: _id,
          last_modified: last_modified,
          connected_realm_id: connected_realm_id,
        });
        if (wt_ext) return

        /** Request existing WT price */
        const wt_price = await wowtoken_db
          .findOne({ region: 'eu' })
          .sort({ _id: -1 })
          .lean();
        if (!wt_price) return

        for (let { flag, currency, wt_value } of wt_const) {
          if (flag === 'PAY FLOAT') {
            await valuations.create({
              name: `PAY FLOAT GOLD / RECEIVE FIX ${currency}`,
              flag: flag,
              item_id: _id,
              connected_realm_id: connected_realm_id,
              type: 'WOWTOKEN',
              last_modified: last_modified,
              value: wt_price.price,
              details: {
                quotation: `gold for FIX ${wt_value} ${currency} or 1m subscription`,
                swap_type: 'PAY FLOAT / RECEIVE FIX',
                description: `You pay always floating (but fixed in a moment of time) amount of gold for fixed payment of ${wt_value} ${currency} or 1m subscription`,
              },
            });
            console.info(`DMA-IVA: ${_id}@${connected_realm_id}, WOWTOKEN BUY GOLD`);
          }
        }
      }
    }

    /** Vendor Valuation Adjustment */
    if (asset_class.includes('VENDOR')) {
      const vendor = await valuations.findOne({
        item_id: _id,
        last_modified: last_modified,
        connected_realm_id: connected_realm_id,
        name: 'VENDOR BUY',
      });
      if (!vendor && args.purchase_price) {
        await valuations.create({
          name: 'VENDOR BUY',
          flag: 'BUY',
          item_id: _id,
          connected_realm_id: connected_realm_id,
          type: 'VENDOR',
          last_modified: last_modified,
          value: args.purchase_price,
        });
        console.info(`DMA-IVA: ${_id}@${connected_realm_id}, VENDOR BUY`);
      }
    }
    if (asset_class.includes('VSP')) {
      const vsp = await valuations.findOne({
        item_id: _id,
        last_modified: last_modified,
        connected_realm_id: connected_realm_id,
        name: 'VENDOR SELL',
      });
      if (!vsp && args.sell_price) {
        await valuations.create({
          name: 'VENDOR SELL',
          flag: 'SELL',
          item_id: _id,
          connected_realm_id: connected_realm_id,
          type: 'VENDOR',
          last_modified: last_modified,
          value: args.sell_price,
        });
        console.info(`DMA-IVA: ${_id}@${connected_realm_id}, VENDOR SELL`);
      }
    }
    /** End of VVA  */

    /**
     * Auction Valuation Adjustment
     */
    if (asset_class.includes('MARKET')) {
      const ava = await valuations.findOne({
        item_id: _id,
        last_modified: last_modified,
        connected_realm_id: connected_realm_id,
        type: 'MARKET',
      });
      if (!ava) {
        /** Request for Quotes */
        const market_data = await auctions_db.aggregate([
          {
            $match: {
              last_modified: last_modified,
              'item.id': _id,
              connected_realm_id: connected_realm_id,
            },
          },
          {
            $project: {
              _id: '$last_modified',
              id: '$id',
              quantity: '$quantity',
              price: {
                $ifNull: ['$buyout', { $ifNull: ['$bid', '$unit_price'] }],
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
                    { $gte: ['$quantity', (args.stackable || 1)] },
                    '$price',
                    { $min: '$price' },
                  ],
                },
              },
              min: { $min: '$price' },
              orders: { $addToSet: '$id' },
            },
          },
        ]).exec()
        if (market_data && market_data.length && market_data[0].value) {
          const item_ava = market_data[0]
          /** Initiate constants */
          const flags = ['BUY', 'SELL'];
          let price = item_ava.value;
          let min = item_ava.min
          /** BUY / SELL */
          for (let flag of flags) {
            if (flag === 'SELL') {
              price = price * 0.95;
              min = min * 0.95
            }
            await valuations.create({
              name: `AUCTION ${flag}`,
              flag: flag,
              item_id: _id,
              connected_realm_id: connected_realm_id,
              type: 'MARKET',
              last_modified: last_modified,
              value: Round2(price),
              details: {
                min_price: min,
                quantity: item_ava.quantity,
                open_interest: Math.round(item_ava.open_interest),
                orders: item_ava.orders,
              },
            });
            console.info(`DMA-IVA: ${_id}@${connected_realm_id}, AUCTION ${flag}`,);
          }

        }
      }
    }
    /** END of AVA */

    /**
     * Derivative Valuation Adjustment
     */
    if (asset_class.includes('DERIVATIVE')) {
      const primary_methods = await pricing_methods.find({ 'derivatives._id': _id, type: { $ne: 'u/r' } }).lean();
      if (!primary_methods || !primary_methods.length) return
      /**
       * Iterating every pricing method
       * and check eva on current timestamp
       */
      for (const price_method of primary_methods) {
        const dva = await valuations.findOne({
          item_id: _id,
          last_modified: last_modified,
          connected_realm_id: connected_realm_id,
          name: `${price_method.ticker}`,
          type: 'DERIVATIVE',
        });
        if (dva) continue

        /**
         * Initialize pricing method evaluation constructor
         * @type {{
         * unsorted_items: [],
         * premium_items: [],
         * reagent_items: [],
         * premium: number,
         * single_name: boolean,
         * nominal_value: number,
         * nominal_value_draft: number,
         * single_derivative: boolean,
         * single_reagent: boolean,
         * single_premium: boolean,
         * premium_clearance: boolean,
         * queue_cost: number,
         * q_reagents_sum: number,
         * q_derivatives_sum: number
         * }}
         */
        const method_evaluations = {
          queue_cost: 0,
          premium: 0,
          nominal_value: 0,
          nominal_value_draft: 0,
          q_reagents_sum: 0,
          q_derivatives_sum: 0,
          premium_items: [],
          reagent_items: [],
          unsorted_items: [],
          single_derivative: true,
          single_reagent: false,
          single_premium: false,
          premium_clearance: true
        }

        /**
         * Check
         * if reagents exists
         * if derivatives exist
         * and iterate them one-by-one
         */
        if (!price_method.reagents || !price_method.reagents.length) continue
        if (!price_method.derivatives || !price_method.derivatives.length) continue;

        /**
         * Initiate flags and share constants for future evaluation
         * @type {{quantity: {default: number, type: NumberConstructor, required: boolean}, _id: {type: NumberConstructor, required: boolean}}|number}
         */
        method_evaluations.q_derivatives_sum = price_method.derivatives.reduce((accum, derivative ) => accum + derivative.quantity, 0)
        method_evaluations.q_reagents_sum = price_method.reagents.reduce((accum, reagent ) => accum + reagent.quantity, 0)

        if (price_method.derivatives.length > 1) method_evaluations.single_derivative = false;
        if (price_method.reagents.length === 1) method_evaluations.single_reagent = true;

        for (const reagent of price_method.reagents) {

          const reagent_item = await items_db.findById(reagent._id).lean()

          if (!reagent_item) continue;

          reagent_item.quantity = reagent.quantity;
          reagent_item.last_modified = last_modified;
          reagent_item.connected_realm_id = connected_realm_id;
          reagent_item.iteration = 0;

          /**
           * Add to PREMIUM for later analysis
           *
           * If premium item is also derivative, like EXPL
           * place them as start of premium_items[]
           * it allow us evaluate more then one premiums
           * in one pricing method
           */
          if (reagent_item.asset_class.includes('PREMIUM')) {
            if (reagent_item.asset_class.includes('DERIVATIVE')) {
              method_evaluations.premium_items.unshift(reagent_item);
            } else {
              method_evaluations.premium_items.push(reagent_item);
            }
            /** We add PREMIUM to reagent_items */
            method_evaluations.reagent_items.push(reagent_item);
          } else {
            /** Find cheapest to delivery method for item on current timestamp */
            const ctd_check = await valuations.findOne({
              item_id: reagent_item._id,
              last_modified: last_modified,
              connected_realm_id: connected_realm_id,
              flag: 'BUY',
            }).sort({value: 1}).lean();

            /** If CTD not found.. */
            if (!ctd_check) await evaluate(reagent_item)

            const ctd = await valuations.findOne({
              item_id: reagent_item._id,
              last_modified: last_modified,
              connected_realm_id: connected_realm_id,
              flag: 'BUY',
            }).sort({value: 1}).lean();

            if (!ctd) method_evaluations.unsorted_items.push(reagent_item);

            /**
             * If ctd is derivative type,
             * replace original reagent_item
             * with underlying reagent_items
             */
            if (ctd) {
              if (ctd.type === 'DERIVATIVE' && ctd.details && ctd.details.reagent_items && ctd.details.reagent_items.length) {
                const underlying_reagent_items = ctd.details.reagent_items;

                for (const underlying_item of underlying_reagent_items) {
                  /** Queue_quantity x underlying_item.quantity */
                  if (underlying_item.value) underlying_item.value = Round2(underlying_item.value * reagent_item.quantity);
                  underlying_item.quantity = underlying_item.quantity * reagent_item.quantity;
                  /** if this item is already in reagent_items, then + quantity */
                  if (method_evaluations.reagent_items.some(ri => ri._id === underlying_item._id)) {
                    /** take in focus by arrayIndex and edit properties */
                    const reagent_itemsIndex = method_evaluations.reagent_items.findIndex(item => item._id === underlying_item._id);
                    if (reagent_itemsIndex !== -1) {
                      method_evaluations.reagent_items[reagent_itemsIndex].value += underlying_item.value;
                      method_evaluations.reagent_items[reagent_itemsIndex].quantity += underlying_item.quantity;
                    }
                  } else {
                    method_evaluations.reagent_items.push(underlying_item);
                  }
                }
              } else {
                reagent_item.value = Round2(ctd.value * reagent_item.quantity);
                method_evaluations.reagent_items.push(reagent_item);
              }
              /** We add value to queue_cost */
              method_evaluations.queue_cost += Round2(ctd.value * reagent_item.quantity);
            }
          }

        }
        /** End of loop for every reagent_item */

        /**
         * Premium Reagent Valuation Adjustment
         *
         * Only for premium_items
         * and single_derivative
         */
        if (method_evaluations.premium_items.length && method_evaluations.single_derivative) {
          /** Pre-valuate nominal value w/o premium part */
          method_evaluations.nominal_value_draft = Round2(method_evaluations.queue_cost / price_method.derivatives[0].quantity);
          method_evaluations.nominal_value = method_evaluations.nominal_value_draft;

          /** Request market price from method item_id */
          const ava = await valuations.findOne({
            item_id: _id,
            last_modified: last_modified,
            connected_realm_id: connected_realm_id,
            type: 'MARKET',
            flag: 'SELL',
          });

          /** If ava.exists and premium_items is one */
          if (method_evaluations.premium_items.length === 1 && ava) {
            method_evaluations.single_premium = true;
            method_evaluations.premium = Round2(ava.value - method_evaluations.queue_cost);
          }

          for (const premium_item of method_evaluations.premium_items) {
            /** Single Name Valuation */
            if (method_evaluations.single_premium) {
              /** Update existing method as a single name */
              await pricing_methods.findByIdAndUpdate(price_method._id, { single_premium: premium_item._id });
              const prva = await valuations.findOne({
                item_id: premium_item._id,
                last_modified: last_modified,
                connected_realm_id: connected_realm_id,
                type: 'PREMIUM',
              });
              if (!prva) {
                await valuations.create({
                  ticker: `${price_method.ticker}`,
                  flag: 'SELL',
                  item_id: premium_item._id,
                  connected_realm_id: connected_realm_id,
                  type: 'PREMIUM',
                  last_modified: last_modified,
                  value: Round2(method_evaluations.premium / premium_item.quantity),
                  details: {
                    wi: Round2(premium_item.quantity / price_method.derivatives[0].quantity * ava.details.quantity,)
                  },
                })
                console.info(`DMA-IVA: ${price_method.item_id}@${connected_realm_id}, ${price_method.ticker}`)
              }
            }

            if (premium_item.asset_class.includes('DERIVATIVE')) {
              /**
               * Find cheapest to delivery
               * for premium_item on current timestamp
               */
              const ctd_check = await valuations.findOne({
                item_id: premium_item._id,
                last_modified: last_modified,
                connected_realm_id: connected_realm_id,
                type: 'DERIVATIVE',
              }).sort({ value: 1 });
              const premium_item_eva = { ...premium_item };
              premium_item_eva.last_modified = last_modified;
              premium_item_eva.connected_realm_id = connected_realm_id;
              premium_item_eva.iterations = 0;
              if (!ctd_check) await evaluate(premium_item_eva)
              const ctd = await valuations.findOne({
                item_id: premium_item._id,
                last_modified: last_modified,
                connected_realm_id: connected_realm_id,
                type: 'DERIVATIVE',
              }).sort({ value: 1 });
              if (!ctd) method_evaluations.unsorted_items.push(premium_item);
              if (ctd) method_evaluations.queue_cost += Round2(ctd.value * premium_item.quantity);
            } else {
              /**
               * CTD FOR PREMIUM
               *
               * When we are first time here, the premium is still clear
               * require additional research
               */
              if (method_evaluations.premium_clearance && ava) {
                method_evaluations.premium = Round2(ava.value - method_evaluations.queue_cost);
                method_evaluations.premium_clearance = false;
              }
              const prva = await valuations.findOne({
                item_id: premium_item._id,
                last_modified: last_modified,
                connected_realm_id: connected_realm_id,
                type: 'PREMIUM',
              }).sort({ 'details.wi': -1 });
              if (prva) {
                method_evaluations.queue_cost += Round2(prva.value * premium_item.quantity);
              } else {
                method_evaluations.unsorted_items.push(premium_item);
              }
            }
          }
          /** End of PRVA loop */
        }
        /** End of PRVA */

        /**
         * Pricing Method Valuation Adjustment
         *
         * Only for Mass Mills and Prospects
         */
        if (!method_evaluations.single_derivative && method_evaluations.single_reagent) {
          /**
           * evaluate derivative_item_share for every Di
           * from queue_cost via cross x reduce
           * @type {number}
           */
          for (const derivative_item of price_method.derivatives) {
            const derivative_item_share = derivative_item.quantity / method_evaluations.q_derivatives_sum
            await valuations.create({
              name: `${price_method.ticker}`,
              flag: 'BUY',
              item_id: derivative_item._id,
              connected_realm_id: connected_realm_id,
              type: 'DERIVATIVE',
              last_modified: last_modified,
              value: Round2((method_evaluations.queue_cost * derivative_item_share) / derivative_item.quantity),
              details: {
                queue_cost: Round2(method_evaluations.queue_cost),
                queue_quantity: Number(derivative_item.quantity),
                queue_share: Round2(derivative_item_share),
                rank: price_method.rank || 0,
                reagent_items: method_evaluations.reagent_items,
                premium_items: method_evaluations.premium_items,
                unsorted_items: method_evaluations.unsorted_items
              },
            })
            console.info(`DMA-IVA: ${derivative_item._id}@${connected_realm_id}, ${price_method.ticker}`)
          }
        }

        /** Single Derivative Pricing Methods */
        if (method_evaluations.single_derivative) {
          method_evaluations.nominal_value = Round2(method_evaluations.queue_cost / price_method.derivatives[0].quantity);

          /** BFA ALCH proc-chance HAX */
          if (
            price_method.expansion === 'BFA' &&
            price_method.profession === 'ALCH' &&
            price_method.rank === 3
          ) {
            method_evaluations.nominal_value = Round2(method_evaluations.nominal_value * 0.6);
          }

          await valuations.create({
            name: `${price_method.ticker}`,
            flag: 'BUY',
            item_id: price_method.derivatives[0]._id,
            connected_realm_id: connected_realm_id,
            type: 'DERIVATIVE',
            last_modified: last_modified,
            value: Round2(method_evaluations.nominal_value),
            details: {
              queue_cost: Round2(method_evaluations.queue_cost),
              queue_quantity: Number(price_method.derivatives[0].quantity),
              rank: price_method.rank || 0,
              reagent_items: method_evaluations.reagent_items,
              premium_items: method_evaluations.premium_items,
              unsorted_items: method_evaluations.unsorted_items
            },
          })
          console.info(`DMA-IVA: ${price_method.derivatives[0]._id}@${connected_realm_id}, ${price_method.ticker}`)
        }
      }
      /** END of MVA */
    }
    /** END of DVA */
  } catch (error) {
    console.error(error)
  }
}

module.exports = evaluate;

