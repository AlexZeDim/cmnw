import {GoldModel, ItemModel, RealmModel, TokenModel, ValuationsModel} from "../db/mongo/mongo.model";
import { FlagType, BuySell, FixFloat, ValuationType } from "../interface/constant";
import {round2} from "../db/mongo/refs";

interface ItemValuationProps {
  _id: number,
  connected_realm_id: number,
  asset_class: string[],
  last_modified: number,
  iteration: number
}

const getCVA = async <T extends ItemValuationProps> (args: T) => {
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

  if (!wt_price) return
  /**
   * Currency Valuation Adjustment
   * Check existing price for gold
   */
  /** Only if existing price not found */
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

const getEvaluation = async <T extends ItemValuationProps> (args: T) => {
  try {
    args.iteration += 1;

    /**
     * Request realm if
     * we don't have ts
     */
    if (args.last_modified === 0) {
      const ts = await RealmModel.findOne({ connected_realm_id: args.connected_realm_id }).select('auctions').lean();
      if (ts) args.last_modified = ts.auctions;
    }

    await getCVA(args)

    console.log(args)
  } catch (e) {
    console.error(e)
  }
}

getEvaluation({ _id: 1, connected_realm_id: 2, asset_class: ['t', 'a'], last_modified: 0, iteration: 0})
