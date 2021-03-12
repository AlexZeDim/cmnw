import {GoldModel, ItemModel, RealmModel, ValuationsModel} from "../db/mongo/mongo.model";
import { FlagType } from "../interface/constant";

interface ItemValuationProps {
  _id: number,
  connected_realm_id: number,
  asset_class: string[],
  last_modified?: number,
  iteration: number
}

const evaluationGold = async <T extends ItemValuationProps> (args: T) => {
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



}

const getEvaluation = async <T extends ItemValuationProps> (args: T) => {
  try {
    args.iteration += 1;

    /**
     * Request realm if
     * we don't have ts
     */
    if (!args.last_modified) {
      const ts = await RealmModel.findOne({ connected_realm_id: args.connected_realm_id }).select('auctions').lean();
      if (ts) args.last_modified = ts.auctions;
    }

    console.log(args)
  } catch (e) {
    console.error(e)
  }
}

getEvaluation({ _id: 1, connected_realm_id: 2, asset_class: ['t', 'a'], iteration: 0})
