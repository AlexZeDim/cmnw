import {GoldModel, RealmModel, TokenModel, ValuationsModel} from "../db/mongo/mongo.model";
import {FlagType, ValuationType} from "../interface/constant";
import {round2} from "../db/mongo/refs";

interface ItemValuationProps {
  _id: number,
  connected_realm_id: number,
  asset_class: string[],
  last_modified: number,
  iteration: number,
  purchase_price?: number,
  sell_price?: number
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
        type: 'VENDOR',
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
        type: 'VENDOR',
        last_modified: args.last_modified,
        value: args.sell_price,
      });
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


    console.log(args)
  } catch (e) {
    console.error(e)
  }
}

getEvaluation({ _id: 1, connected_realm_id: 2, asset_class: ['t', 'a'], last_modified: 0, iteration: 0})
