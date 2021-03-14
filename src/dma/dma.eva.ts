import {
  AuctionsModel,
  GoldModel,
  ItemModel,
  PricingModel,
  RealmModel,
  TokenModel,
  ValuationsModel
} from "../db/mongo/mongo.model";
import {FlagType, ValuationType} from "../interface/constant";
import {round2} from "../db/mongo/refs";

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

const getCVA = async <T extends ItemValuationProps> (args: T): Promise<void> => {
  if (!args.asset_class.includes('GOLD')) return;
  /** Request timestamp for gold */
  const ts = await RealmModel.findOne({ connected_realm_id: args.connected_realm_id }).select('auctions golds').lean();
  if (!ts) return
  /** Check existing pricing */
  const currency = await ValuationsModel.findOne({
    item_id: args._id,
    last_modified: ts.auctions,
    connected_realm_id: args.connected_realm_id,
  })
  if (currency) return
  /**
   * If pricing not found, get existing the lowest by price document
   * Quantity > 100k+ g
   */
  const ctd_gold = await GoldModel.findOne({
    connected_realm_id: args.connected_realm_id,
    last_modified: ts.golds,
    quantity: { $gte: 100000 },
  }).sort('price').lean();
  if (!ctd_gold) return
  /** Predefined flags, venue, price, etc */
  const
    flags = ['BUY', 'SELL'],
    faction = ctd_gold.faction.toUpperCase();

  /** Evaluate OTC */
  for (const flag of flags) {
    await ValuationsModel.create({
      name: `GOLD/RUB ${faction} ${flag} FUNPAY`,
      flag: flag,
      item_id: args._id,
      connected_realm_id: args.connected_realm_id,
      type: flag === FlagType.S ? ValuationType.Otc : ValuationType.Funpay,
      last_modified: args.last_modified,
      value: flag === FlagType.S ? round2(ctd_gold.price * 0.75) : round2(ctd_gold.price),
      details: {
        description: flag === FlagType.S ? 'Price nominated in RUB for every x1000 gold (lot) and it represents the exact figure that the buyer will pay to the seller in a moment of time, in exchange for x1000 gold (lot) with at least 100 000+ g buy order. Quotes are provided by Funpay.ru — the hugest currency exchange in CIS region.' : 'Price nominated in RUB for every x1000 gold (lot) and it represents the exact figure that the buyer will pay to the seller in a moment of time, in exchange for x1000 gold (lot) with at least 100 000+ g buy order. Quotes are provided by Funpay.ru — the hugest currency exchange in CIS region.',
        quotation: 'RUB per x1000',
        lot_size: 1000,
        minimal_settlement_amount: 100000,
      }
    })
  }

  /** Request WoWToken price */
  const
    wt_price = await TokenModel.findOne({ region: 'eu' }).sort({ _id: -1 }).lean(),
    wt_ext = await ValuationsModel.findOne({
      item_id: args._id,
      last_modified: args.last_modified,
      connected_realm_id: args.connected_realm_id,
      type: ValuationType.Wowtoken,
    }),
    wt_const = [
      {
        flag: FlagType.S,
        wt_value: 550,
        currency: 'RUB',
        description:
          'Represents the price per each x1000 gold, when you are exchanging your gold for Battle.net balance or 1m subscription',
      },
      {
        flag: FlagType.B,
        wt_value: 1400,
        currency: 'RUB',
        description:
          'Represents the price per each x1000 gold, when you are buying gold from Blizzard via WoWToken',
      },
    ];

  if (!wt_price || wt_ext) return
  /**
   * Currency Valuation Adjustment
   * Check existing price for gold
   * Only if existing price not found
   */
  for (const { flag, wt_value, currency, description } of wt_const) {
    await ValuationsModel.create({
      name: `GOLD/${currency} ${flag} WOWTOKEN`,
      flag: flag,
      item_id: args._id,
      connected_realm_id: args.connected_realm_id,
      type: ValuationType.Wowtoken,
      last_modified: args.last_modified,
      value: parseFloat((wt_value / Math.floor(wt_price.price / 1000)).toFixed(2)),
      details: {
        quotation: `${currency} per x1000`,
        lot_size: 1000,
        minimal_settlement_amount: wt_price.price,
        description: description,
      }
    })
  }
}

const getTVA = async <T extends ItemValuationProps> (args: T): Promise<void> => {
  if (!args.asset_class.includes('WOWTOKEN')) return;
  /** CONSTANT AMOUNT */
  const wt_const = [
    {
      flag: FlagType.FLOAT,
      wt_value: 550,
      currency: 'RUB',
    },
    {
      flag: FlagType.FIX,
      wt_value: 1400,
      currency: 'RUB',
    },
  ];
  /** PAY CURRENCY RECEIVE GOLD */
  if (args._id === 122270) {
    /** Check actual pricing for PAY FIX / RECEIVE FLOAT */
    const wt = await ValuationsModel.findOne({
      item_id: args._id,
      last_modified: args.last_modified,
    });
    if (wt) return

    /** Check if pricing exists at all */
    const wt_ext = await ValuationsModel.find({ item_id: args._id });
    if (wt_ext.length) {
      /** If yes, updated all the CONST values */
      await ValuationsModel.updateMany(
        { item_id: args._id },
        { last_modified: args.last_modified },
      );
    } else {
      await RealmModel
        .find({ locale: 'en_GB' })
        .cursor()
        .eachAsync(async ({ connected_realm_id }) => {
          for (const { flag, currency, wt_value } of wt_const) {
            if (flag === FlagType.FIX) {
              await ValuationsModel.create(
                {
                  name: `PAY FIX ${currency} / RECEIVE FLOAT GOLD`,
                  flag: flag,
                  item_id: args._id,
                  connected_realm_id: connected_realm_id,
                  type: ValuationType.Wowtoken,
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
        })
    }
  }

  /** PAY GOLD RECEIVE CURRENCY */
  if (args._id === 122284) {
    /** Check existing pricing for PAY FLOAT / RECEIVE FIX */
    const wt_ext = await ValuationsModel.findOne({
      item_id: args._id,
      last_modified: args.last_modified,
      connected_realm_id: args.connected_realm_id,
    });
    if (wt_ext) return

    /** Request existing WT price */
    const wt_price = await TokenModel
      .findOne({ region: 'eu' })
      .sort({ _id: -1 })
      .lean();
    if (!wt_price) return

    for (let { flag, currency, wt_value } of wt_const) {
      if (flag === FlagType.FLOAT) {
        await ValuationsModel.create({
          name: `PAY FLOAT GOLD / RECEIVE FIX ${currency}`,
          flag: flag,
          item_id: args._id,
          connected_realm_id: args.connected_realm_id,
          type: ValuationType.Wowtoken,
          last_modified: args.last_modified,
          value: wt_price.price,
          details: {
            quotation: `gold for FIX ${wt_value} ${currency} or 1m subscription`,
            swap_type: 'PAY FLOAT / RECEIVE FIX',
            description: `You pay always floating (but fixed in a moment of time) amount of gold for fixed payment of ${wt_value} ${currency} or 1m subscription`,
          },
        });
      }
    }
  }
}

const getVVA = async <T extends ItemValuationProps> (args : T) => {
  if (!args.asset_class.includes('VENDOR') && !args.asset_class.includes('VSP')) return

  if (args.asset_class.includes('VENDOR')) {
    const vendor = await ValuationsModel.findOne({
      item_id: args._id,
      last_modified: args.last_modified,
      connected_realm_id: args.connected_realm_id,
      name: 'VENDOR BUY',
    });
    if (!vendor && args.purchase_price) {
      await ValuationsModel.create({
        name: 'VENDOR BUY',
        flag: FlagType.B,
        item_id: args._id,
        connected_realm_id: args.connected_realm_id,
        type: ValuationType.Vendor,
        last_modified: args.last_modified,
        value: args.purchase_price,
      });
    }
  }

  if (args.asset_class.includes('VSP')) {
    const vsp = await ValuationsModel.findOne({
      item_id: args._id,
      last_modified: args.last_modified,
      connected_realm_id: args.connected_realm_id,
      name: 'VENDOR SELL',
    });
    if (!vsp && args.sell_price) {
      await ValuationsModel.create({
        name: 'VENDOR SELL',
        flag: FlagType.S,
        item_id: args._id,
        connected_realm_id: args.connected_realm_id,
        type: ValuationType.Vendor,
        last_modified: args.last_modified,
        value: args.sell_price,
      });
    }
  }
}

const getAVA = async <T extends ItemValuationProps> (args: T) => {
  if (!args.asset_class.includes('MARKET')) return

  const ava = await ValuationsModel.findOne({
    item_id: args._id,
    last_modified: args.last_modified,
    connected_realm_id: args.connected_realm_id,
    type: ValuationType.Market,
  });
  if (!ava) {
    /** Request for Quotes */
    const [market_data]: MarketData[] = await AuctionsModel.aggregate([
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
    ]).exec()
    if (!market_data) return
    /** Initiate constants */
    const flags = ['BUY', 'SELL'];
    for (let flag of flags) {
      await ValuationsModel.create({
        name: `AUCTION ${flag}`,
        flag: flag,
        item_id: args._id,
        connected_realm_id: args.connected_realm_id,
        type: ValuationType.Market,
        last_modified: args.last_modified,
        value: flag === FlagType.S ? round2(market_data.value * 0.95) : round2(market_data.value),
        details: {
          min_price: flag === FlagType.S ? round2(market_data.min * 0.95) : round2(market_data.min),
          quantity: market_data.quantity,
          open_interest: Math.round(market_data.open_interest),
          orders: market_data.orders
        }
      })
    }
  }
}

const getDVA = async <T extends ItemValuationProps> (args: T) => {
  if (!args.asset_class.includes('DERIVATIVE')) return

  const primary_methods = await PricingModel.find({ 'derivatives._id': args._id, type: { $ne: 'u/r' } }).lean();
  if (!primary_methods.length) return
  /**
   * Iterating every pricing method
   * if reagents exists
   * if derivatives exist
   * and iterate them one-by-one
   */
  for (const price_method of primary_methods) {

    if (!price_method.reagents.length || !price_method.derivatives.length) continue

    /**
     * Check DVA on current timestamp
     * and if newDVA create constructor
     */
    const dva = await ValuationsModel.findOne({
      item_id: args._id,
      last_modified: args.last_modified,
      connected_realm_id: args.connected_realm_id,
      name: `${price_method.ticker}`,
      type: ValuationType.Derivative,
    });

    if (dva) continue

    const method_evaluations: MethodEvaluation = {
      queue_cost: 0,
      derivatives_cost: 0,
      premium: 0,
      nominal_value: 0,
      nominal_value_draft: 0,
      q_reagents_sum: price_method.reagents.reduce((accum, reagent ) => accum + reagent.quantity, 0),
      q_derivatives_sum: price_method.derivatives.reduce((accum, derivative ) => accum + derivative.quantity, 0),
      premium_items: [],
      reagent_items: [],
      unsorted_items: [],
      single_derivative: true,
      single_reagent: false,
      single_premium: false,
      premium_clearance: true
    }

    if (price_method.derivatives.length > 1) method_evaluations.single_derivative = false;
    if (price_method.reagents.length === 1) method_evaluations.single_reagent = true;

    /**
     * Evaluate every reagent
     * in pricing one by one
     */
    for (const reagent of price_method.reagents) {
      const item = await ItemModel.findById(reagent._id).lean()
      if (!item) continue;

      const reagent_item = { ...item, ...{
        quantity: reagent.quantity,
        last_modified: args.last_modified,
        connected_realm_id: args.connected_realm_id,
        iteration: 0
      }};

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
        const ctd = await ValuationsModel.findOne({
          item_id: reagent_item._id,
          last_modified: args.last_modified,
          connected_realm_id: args.connected_realm_id,
          flag: FlagType.B,
        }).sort({value: 1}).lean();

        /**
         * If CTD not found..
         * TODO probably add to Q & return
         */
        if (!ctd) {
          await getEvaluation(reagent_item);
          return
        }

        /**
         * If CTD is derivative type,
         * replace original reagent_item
         * with underlying reagent_items
         */
        if (ctd.type === 'DERIVATIVE' && ctd.details && ctd.details.reagent_items && ctd.details.reagent_items.length) {
          const underlying_reagent_items = ctd.details.reagent_items;
          for (const underlying_item of underlying_reagent_items) {
            /** Queue_quantity x Underlying_item.quantity */
          }
        }

      }

    }
  }

}

const getEvaluation = async <T extends ItemValuationProps> (args: T) => {
  try {
    args.iteration += 1;

    /**
     * Request realm if
     * we don't have ts
     * TODO below certain timestamp
     */
    if (args.last_modified === 0) {
      const ts = await RealmModel.findOne({ connected_realm_id: args.connected_realm_id }).select('auctions').lean();
      if (ts) args.last_modified = ts.auctions;
    }

    await getCVA(args);
    await getTVA(args);
    await getVVA(args);
    await getAVA(args);

    console.log(args)
  } catch (e) {
    console.error(e)
  }
}

getEvaluation({ _id: 1, connected_realm_id: 2, asset_class: ['t', 'a'], last_modified: 0, iteration: 0})
