import { LeanDocument } from 'mongoose';
import { Auction, Contract, Item } from '@app/mongo';
import { ItemPricing } from '@app/mongo/schemas/pricing.schema';

class ItemNames {
  en_US: string;
  es_MX: string;
  pt_BR: string;
  de_DE: string;
  en_GB: string;
  es_ES: string;
  fr_FR: string;
  it_IT: string;
  ru_RU: string;
}

export interface ItemValuationQI {
  _id: number,
  last_modified: number,
  connected_realm_id: number,
  iteration: number,
}

/**
 * Value Adjustable Class
 * argument for evaluation functions
 */
export class ItemVAI implements Pick<Item, '_id' | 'name'>, ItemValuationQI {
  readonly _id: number;

  readonly name: ItemNames;

  readonly quality: string;

  readonly asset_class: LeanDocument<String>[];

  readonly tags: LeanDocument<String>[];

  readonly ilvl: number;

  readonly level: number;

  readonly icon: string;

  readonly item_class: string;

  readonly item_subclass: string;

  readonly purchase_price: number;

  readonly purchase_quantity: number;

  readonly sell_price: number;

  readonly is_equippable: boolean;

  readonly is_stackable: boolean;

  readonly inventory_type: string;

  readonly loot_type: string;

  readonly contracts: boolean;

  readonly expansion: string;

  readonly stackable: number;

  readonly profession_class: string;

  readonly ticker: string;

  readonly last_modified: number;

  readonly connected_realm_id: number;

  readonly iteration: number;
}

export interface ItemInterface {
  quality: string,
  item_class: string,
  item_subclass: string,
  inventory_type: string,
  purchase_price: number,
  sell_price: number,
  preview_item: string,
  loot_type: string
}

export interface PricingInterface {
  recipe_id: number,
  expansion: string,
  profession: number,
}

export interface PricingMethods {
  faction?: string,
  recipe_id: number,
  reagents: Record<string, any>[],
  item_id: number,
  expansion: string,
  item_quantity: number,
}

export interface ChartOrderInterface {
  x: number,
  y: number,
  orders: number,
  value: number,
  oi: number,
}

export interface OrderQuotesInterface {
  readonly id: number,
  readonly price: number,
  readonly quantity: number,
  readonly open_interest: number,
  readonly size: number,
}

export interface OrderXrsInterface {
  _id: string | number;
  xIndex: number;
  orders: number;
  value: number;
  oi: number;
  price: number;
}

export interface RealmAInterface {
  readonly _id: number,
  readonly realms: string[],
  readonly slug: string,
  readonly connected_realm_id: number;
  readonly golds: number;
  readonly auctions: number;
  readonly valuations: number;
}

export interface RealmVAInterface {
  readonly _id: number;
  readonly auctions: number;
  readonly valuations: number;
}

export interface AuctionsVAInterface {
  readonly _id: number;
  readonly data: LeanDocument<Auction>;
}

export interface FunPayGoldInterface {
  readonly realm: string;
  readonly faction: string;
  readonly status: boolean;
  readonly quantity: string;
  readonly owner: string;
  readonly price: string;
}

/**
 * Market Data Response from aggregation
 * for Auction Valuation Adjustable
 */
export interface MarketDataInterface {
  _id: number,
  quantity: number,
  open_interest: number,
  value: number,
  min: number,
  orders: number[]
}


export interface ContractAggregation extends LeanDocument<Contract> {
  _id: string;
  item_id: number;
  connected_realm_id: number;
  last_modified: number;
  date: {
    day: number;
    week: number;
    month: number;
    year: number;
  };
  price: number;
  price_size: number;
  quantity: number;
  open_interest: number;
}

/**
 * Reagent Item Interface
 * extends Item & Pricing(Q) & implement value: number(0)
 */
export class ReagentItemI implements LeanDocument<Item>, ItemPricing {
  readonly _id: number;

  readonly contracts: boolean;

  readonly expansion: string;

  readonly icon: string;

  readonly ilvl: number;

  readonly inventory_type: string;

  readonly is_equippable: boolean;

  readonly is_stackable: boolean;

  readonly item_class: string;

  readonly item_subclass: string;

  readonly level: number;

  readonly loot_type: string;

  readonly name: ItemNames;

  readonly profession_class: string;

  readonly purchase_price: number;

  readonly purchase_quantity: number;

  readonly quality: string;

  readonly sell_price: number;

  readonly stackable: number;

  readonly ticker: string;

  readonly asset_class: LeanDocument<String>[];

  readonly tags: LeanDocument<String>[];

  // ItemPricing
  quantity: number;
  // Implement Value
  value: number;
}


export class MethodEvaluation {

  queue_cost: number;

  derivatives_cost: number;

  premium: number;

  nominal_value: number;

  nominal_value_draft: number;

  reagent_quantity_sum: number;

  derivative_quantity_sum: number;

  premium_items: ReagentItemI[];

  reagent_items: ReagentItemI[];

  unsorted_items: ReagentItemI[];

  single_derivative: boolean;

  single_reagent: boolean;

  single_premium: boolean;

  premium_clearance: boolean
}
