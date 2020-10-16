/**
 * Model importing
 */

const valuations = require('../../../db/valuations_db');
const pricing_methods = require('../../../db/pricing_methods_db');
const golds_db = require('../../../db/golds_db');
const wowtoken_db = require('../../../db/wowtoken_db');
const realms_db = require('../../../db/realms_db');

/**
 * Modules
 */

const getPricingMethods = require('../getPricingMethods');
const auctionsQuotes = require('../../auctions/auctionsQuotes');
const { Round2 } = require('../../../db/setters');

/**
 *
 * @param item {Object}
 * @param connected_realm_id {Number}
 * @param last_modified {Number}
 * @param item_depth {Number}
 * @returns {Promise<void>}
 */

async function iva(
  item,
  connected_realm_id = 1602,
  last_modified,
  item_depth = 0,
) {
  try {
    console.info(`DMA-${iva.name},${item.ticker ? item.ticker : item.name.en_GB}@${connected_realm_id},${item_depth}`);

    /**
     * Getting timestamps
     */
    if (!last_modified) {
      let t = await realms_db
        .findOne({ connected_realm_id: connected_realm_id })
        .select('auctions')
        .lean();
      if (t) {
        last_modified = t.auctions;
      }
    }
    /**
     * Gold Valuation Adjustment
     * .asset_class.includes('CURRENCY')
     */
    if (item._id === 1) {
      /** Request timestamp for gold */
      let t = await realms_db
        .findOne({ connected_realm_id: connected_realm_id })
        .select('auctions golds')
        .lean();
      /** Check existing pricing */
      let currency = await valuations.findOne({
        item_id: item._id,
        last_modified: t.auctions,
        connected_realm_id: connected_realm_id,
      });
      if (!currency) {
        /** If pricing not found, get existing the lowest by price document */
        /** Quantity > 100k+ g */
        let ctd_gold = await golds_db
          .findOne({
            connected_realm_id: connected_realm_id,
            last_modified: t.golds,
            quantity: { $gte: 100000 },
          })
          .sort('price');
        if (ctd_gold) {
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
            currency = new valuations({
              name: `GOLD/RUB ${faction} ${flag} FUNPAY`,
              flag: flag,
              item_id: item._id,
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
            await currency.save();
            console.info(
              `DMA-${iva.name}: ${item._id}@${currency.connected_realm_id},${currency.name}`,
            );
          }
        }
      }

      /** Request WoWToken price */
      let wt_price = await wowtoken_db
        .findOne({ region: 'eu' })
        .sort({ _id: -1 })
        .lean();
      if (wt_price) {
        /**
         * Currency Valuation Adjustment
         * Check existing price for gold
         */

        let wt_ext = await valuations.findOne({
          item_id: item._id,
          last_modified: last_modified,
          connected_realm_id: connected_realm_id,
          type: 'WOWTOKEN',
        });
        if (!wt_ext) {
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
          for (let { flag, wt_value, currency, description } of wt_const) {
            let gwt = new valuations({
              name: `GOLD/${currency} ${flag} WOWTOKEN`,
              flag: flag,
              item_id: item._id,
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
            await gwt.save();
            console.info(
              `DMA-${iva.name}: ${item._id}@${connected_realm_id}, GOLD/${currency} ${flag} WOWTOKEN`,
            );
          }
        }
      }
    }

    /** WoWToken and Currency Valuation Adjustment */
    if (item.asset_class.includes('WOWTOKEN')) {
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
      if (item._id === 122270) {
        /** Check actual pricing for PAY FIX / RECEIVE FLOAT */
        let wt = await valuations.findOne({
          item_id: item._id,
          last_modified: last_modified,
        });
        if (!wt) {
          /** Check if pricing exists at all */
          let wt_ext = await valuations.find({ item_id: item._id });
          if (wt_ext.length) {
            /** If yes, updated all the CONST values */
            valuations.updateMany(
              { item_id: item._id },
              { last_modified: last_modified },
            );
            console.info(
              `DMA-${iva.name}: ${item._id}@${connected_realm_id},WOWTOKEN BUY`,
            );
          } else {
            /** Initiate the very first pricing predetermined */
            let initial_wt = [];
            await realms_db
              .find({ locale: 'en_GB' })
              .cursor()
              .eachAsync(({ connected_realm_id }) => {
                for (let { flag, currency, wt_value } of wt_const) {
                  if (flag === 'PAY FIX') {
                    initial_wt.push({
                      name: `PAY FIX ${currency} / RECEIVE FLOAT GOLD`,
                      flag: flag,
                      item_id: item._id,
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
                    console.info(
                      `DMA-${iva.name}: ${item._id}@${connected_realm_id},WOWTOKEN BUY ${currency}`,
                    );
                  }
                }
              });
            await valuations.insertMany(initial_wt);
            console.info(
              `DMA-${iva.name}: ${item._id}@${connected_realm_id}, INITIAL WOWTOKEN`,
            );
          }
        }
      }

      /** PAY GOLD RECEIVE CURRENCY */
      if (item._id === 122284) {
        /** Check existing pricing for PAY FLOAT / RECEIVE FIX */
        let wt_ext = await valuations.findOne({
          item_id: item._id,
          last_modified: last_modified,
          connected_realm_id: connected_realm_id,
        });
        if (!wt_ext) {
          /** Request existing WT price */
          let wt_price = await wowtoken_db
            .findOne({ region: 'eu' })
            .sort({ _id: -1 })
            .lean();
          if (wt_price) {
            for (let { flag, currency, wt_value } of wt_const) {
              if (flag === 'PAY FLOAT') {
                let wowtoken = new valuations({
                  name: `PAY FLOAT GOLD / RECEIVE FIX ${currency}`,
                  flag: flag,
                  item_id: item._id,
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
                await wowtoken.save();
                console.info(
                  `DMA-${iva.name}: ${item._id}@${connected_realm_id},WOWTOKEN BUY GOLD`,
                );
              }
            }
          }
        }
      }
    }

    /** Vendor Valuation Adjustment */
    if (item.asset_class.includes('VENDOR')) {
      let vendor = await valuations.findOne({
        item_id: item._id,
        last_modified: last_modified,
        connected_realm_id: connected_realm_id,
        name: 'VENDOR BUY',
      });
      if (!vendor) {
        vendor = new valuations({
          name: 'VENDOR BUY',
          flag: 'BUY',
          item_id: item._id,
          connected_realm_id: connected_realm_id,
          type: 'VENDOR',
          last_modified: last_modified,
          value: item.purchase_price,
        });
        await vendor.save();
        console.info(
          `DMA-${iva.name}: ${item._id}@${vendor.connected_realm_id},${vendor.name}`,
        );
      }
    }
    if (item.asset_class.includes('VSP')) {
      let vsp = await valuations.findOne({
        item_id: item._id,
        last_modified: last_modified,
        connected_realm_id: connected_realm_id,
        name: 'VENDOR SELL',
      });
      if (!vsp) {
        vsp = new valuations({
          name: 'VENDOR SELL',
          flag: 'SELL',
          item_id: item._id,
          connected_realm_id: connected_realm_id,
          type: 'VENDOR',
          last_modified: last_modified,
          value: item.sell_price,
        });
        await vsp.save();
        console.info(
          `DMA-${iva.name}: ${item._id}@${vsp.connected_realm_id},${vsp.name}`,
        );
      }
    }
    /** End of VVA  */

    /***
     * Auction Valuation Adjustment
     */
    if (item.asset_class.includes('MARKET')) {
      let ava = await valuations.findOne({
        item_id: item._id,
        last_modified: last_modified,
        connected_realm_id: connected_realm_id,
        type: 'MARKET',
      });
      if (!ava) {
        /** Request for Quotes */
        let {
          min,
          min_size,
          _id,
          quantity,
          open_interest,
          orders,
        } = await auctionsQuotes(item._id, connected_realm_id);
        /** If price found, then => market */
        if (min) {
          /** Initiate constants */
          const flags = ['BUY', 'SELL'];
          let price = min;
          let price_size = min_size;
          /** BUY / SELL */
          for (let flag of flags) {
            if (flag === 'SELL') {
              price = price * 0.95;
              price_size = price_size * 0.95;
            }
            ava = new valuations({
              name: `AUCTION ${flag}`,
              flag: flag,
              item_id: item._id,
              connected_realm_id: connected_realm_id,
              type: 'MARKET',
              last_modified: _id,
              value: Round2(price),
              details: {
                price_size: Round2(price_size),
                quantity: quantity,
                open_interest: Math.round(open_interest),
                orders: orders,
              },
            });
            await ava.save();
            console.info(
              `DMA-${iva.name}: ${item._id}@${ava.connected_realm_id},${ava.name}`,
            );
          }
        }
      }
    }
    /** END of AVA */

    /***
     * Derivative Valuation Adjustment
     */
    if (item.asset_class.includes('DERIVATIVE')) {
      /** Request all Pricing Methods */
      let primary_methods = await getPricingMethods(item._id, false);
      /** Iterate over primary_methods one by one */
      if (primary_methods && primary_methods.length) {
        for (let price_method of primary_methods) {
          /** We should check pricing method first */
          let dva = await valuations.findOne({
            item_id: price_method.item_id,
            last_modified: last_modified,
            connected_realm_id: connected_realm_id,
            name: `${price_method._id}`,
            type: 'DERIVATIVE',
          });
          if (!dva) {
            /** Initiate queue_cost, nominal_value, and premium */
            let queue_cost = 0;
            let premium = 0;
            let nominal_value = 0;
            let premium_items = [];
            let reagent_items = [];
            let unsorted_items = [];
            /** Check if reagent_items exists */
            if (
              price_method.reagent_items &&
              price_method.reagent_items.length
            ) {
              /** Loop for every reagent_item */
              for (let reagent_item of price_method.reagent_items) {
                /** Premium items to later analysis */
                if (reagent_item.asset_class.includes('PREMIUM')) {
                  /** If premium is also derivative, like EXPL, place them as start of reagent_items[] */
                  if (reagent_item.asset_class.includes('DERIVATIVE')) {
                    premium_items.unshift(reagent_item);
                  } else {
                    premium_items.push(reagent_item);
                  }
                  /** We anyway add PREMIUM to reagent_items */
                  reagent_items.push(reagent_item);
                } else {
                  /** Find cheapest to delivery for item on current timestamp */
                  let ctd = await valuations
                    .findOne({
                      item_id: reagent_item._id,
                      last_modified: last_modified,
                      connected_realm_id: connected_realm_id,
                      flag: 'BUY',
                    })
                    .sort('value');
                  /** If CTD not found.. */
                  if (!ctd) {
                    /** ..then cast IVA on reagent_item */
                    await iva(
                      reagent_item,
                      connected_realm_id,
                      last_modified,
                      item_depth + 1,
                    );
                    /** CTD once again.. */
                    ctd = await valuations
                      .findOne({
                        item_id: reagent_item._id,
                        last_modified: last_modified,
                        connected_realm_id: connected_realm_id,
                        flag: 'BUY',
                      })
                      .sort('value');
                    /** ..if no, then unsorted_item */
                    if (!ctd) {
                      unsorted_items.push(reagent_item);
                    }
                  }
                  if (ctd) {
                    if (ctd.type === 'DERIVATIVE') {
                      /**
                       * If ctd is derivative type, replace original reagent_item
                       * with underlyingReagentItems
                       */
                      if (ctd.details) {
                        const underlyingReagentItems =
                          ctd.details.reagent_items;
                        for (let underlyingElement of underlyingReagentItems) {
                          /** Quene_quantity x underlyingElement.quantity */
                          if (underlyingElement.value) {
                            underlyingElement.value = Round2(
                              underlyingElement.value * reagent_item.quantity,
                            );
                          }
                          underlyingElement.quantity =
                            underlyingElement.quantity * reagent_item.quantity;
                          /** if this item is already in reagent_items, then + quantity */
                          if (
                            reagent_items.some(
                              ri => ri._id === underlyingElement._id,
                            )
                          ) {
                            /** take in focus by arrayIndex and edit properties */
                            const reagent_itemsIndex = reagent_items.findIndex(
                              item => item._id === underlyingElement._id,
                            );
                            reagent_items[reagent_itemsIndex].value +=
                              underlyingElement.value;
                            reagent_items[reagent_itemsIndex].quantity +=
                              underlyingElement.quantity;
                          } else {
                            reagent_items.push(underlyingElement);
                          }
                        }
                      }
                    } else {
                      reagent_item.value = Round2(
                        ctd.value * reagent_item.quantity,
                      );
                      reagent_items.push(reagent_item);
                    }
                    /** Anyway we add value to queue_cost */
                    queue_cost += Round2(ctd.value * reagent_item.quantity);
                  }
                }
              }
              /** End of MVA */

              /** Pre-valuate nominal value w/o premium part */
              nominal_value = Round2(queue_cost / price_method.item_quantity);

              if (premium_items.length) {
                /** Request market price from method item_id */
                let ava = await valuations.findOne({
                  item_id: price_method.item_id,
                  last_modified: last_modified,
                  connected_realm_id: connected_realm_id,
                  type: 'MARKET',
                  flag: 'SELL',
                });
                let single_name = false;
                let premium_clearance = true;
                /** If ava.exists and premium_items is one */
                if (premium_items.length === 1 && ava) {
                  single_name = true;
                  premium = Round2(ava.value - queue_cost);
                }
                /**
                 * Premium Reagent Valuation Adjustment
                 */
                for (let premium_item of premium_items) {
                  /** Single Name Valuation */
                  if (single_name) {
                    /** Update existing method as a single name */
                    await pricing_methods.findByIdAndUpdate(price_method._id, {
                      single_name: premium_item._id,
                    });
                    /** Check if PRVA for current premium item is exists */
                    let prva = await valuations.findOne({
                      item_id: premium_item._id,
                      last_modified: last_modified,
                      connected_realm_id: connected_realm_id,
                      name: `${price_method._id}`,
                      type: 'PREMIUM',
                    });
                    if (!prva) {
                      prva = new valuations({
                        name: `${price_method._id}`,
                        flag: 'SELL',
                        item_id: premium_item._id,
                        connected_realm_id: connected_realm_id,
                        type: 'PREMIUM',
                        last_modified: last_modified,
                        value: Round2(premium / premium_item.quantity),
                        details: {
                          wi: Round2(
                            premium_item.quantity / price_method.item_quantity * ava.details.quantity,
                          ),
                        },
                      });
                      await prva.save();
                      console.info(
                        `DMA-${iva.name}: ${price_method._id}@${prva.connected_realm_id},${prva.name}`,
                      );
                    }
                  }
                  if (premium_item.asset_class.includes('DERIVATIVE')) {
                    /** Find cheapest to delivery for premium_item on current timestamp */
                    let ctd = await valuations
                      .findOne({
                        item_id: premium_item._id,
                        last_modified: last_modified,
                        connected_realm_id: connected_realm_id,
                        type: 'DERIVATIVE',
                      })
                      .sort('value');
                    /** If CTD not found.. */
                    if (!ctd) {
                      /** ..then IVA on premium_item */
                      await iva(
                        premium_item,
                        connected_realm_id,
                        last_modified,
                        item_depth + 1,
                      );
                      /** CTD once again.. */
                      let ctd = await valuations
                        .findOne({
                          item_id: premium_item._id,
                          last_modified: last_modified,
                          connected_realm_id: connected_realm_id,
                          type: 'DERIVATIVE',
                        })
                        .sort('value');
                      /** ..if no, then unsorted_item */
                      if (!ctd) {
                        unsorted_items.push(premium_item);
                      }
                    }
                    if (ctd) {
                      queue_cost += Round2(ctd.value * premium_item.quantity);
                    }
                  } else {
                    /**
                     * CTD FOR PREMIUM
                     *
                     * When we are first time here, the premium is still clear
                     */
                    if (premium_clearance && ava) {
                      premium = Round2(ava.value - queue_cost);
                      premium_clearance = false;
                    }
                    let prva = await valuations
                      .findOne({
                        item_id: premium_item._id,
                        last_modified: last_modified,
                        connected_realm_id: connected_realm_id,
                        type: 'PREMIUM',
                      })
                      .sort({ 'details.wi': -1 });
                    if (prva) {
                      queue_cost += Round2(prva.value * premium_item.quantity);
                    } else {
                      unsorted_items.push(premium_item);
                    }
                  }
                }
                /** End of PRVA loop */
              }
              /** End of PRVA */
            }

            nominal_value = Round2(queue_cost / price_method.item_quantity);
            //FIXME divide by zero
            if (isNaN(nominal_value)) {
              console.log(queue_cost, price_method.item_quantity);
            }
            /** Proc change HAX */
            if (
              price_method.expansion === 'BFA' &&
              price_method.profession === 'ALCH' &&
              price_method.rank === 3
            ) {
              nominal_value = Round2(nominal_value * 0.6);
            }

            /** Derivative Valuation Adjustment */
            dva = new valuations({
              name: `${price_method._id}`,
              flag: 'BUY',
              item_id: price_method.item_id,
              connected_realm_id: connected_realm_id,
              type: 'DERIVATIVE',
              last_modified: last_modified,
              value: Round2(nominal_value),
              details: {
                queue_cost: Round2(queue_cost),
                queue_quantity: parseInt(price_method.item_quantity),
                rank: price_method.rank || 0,
                reagent_items: reagent_items,
              },
            });
            if (premium_items.length) {
              dva.details.premium_items = premium_items;
            }
            if (unsorted_items.length) {
              dva.details.unsorted_items = unsorted_items;
            }
            await dva.save();
            console.info(
              `DMA-${iva.name}: ${price_method._id}@${dva.connected_realm_id},${dva.name}`,
            );
          }
          /** END of MVA */
        }
      }
    }
    /** END of DVA */
  } catch (e) {
    console.log(e);
  }
}

module.exports = iva;
