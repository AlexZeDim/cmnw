import { LeanDocument } from 'mongoose';
import { Item } from '@app/mongo';
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

export interface IVQInterface {
  _id: number,
  last_modified: number,
  connected_realm_id: number,
  iteration: number,
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

export interface RealmAggregationInterface {
  readonly _id: number,
  readonly realms: string[],
  readonly slug: string,
  readonly connected_realm_id: number;
  readonly golds: number;
  readonly auctions: number;
  readonly valuations: number;
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

/**
 * Value Adjustable Interface
 * argument for evaluation functions
 */
export interface VAInterface
  extends LeanDocument<Item>, IVQInterface {
  _id: number,
  name: ItemNames,
  quality: string,
  ilvl: number,
  level: number,
  icon: string,
  item_class: string,
  item_subclass: string,
  purchase_price: number,
  purchase_quantity: number,
  sell_price: number,
  is_equippable: boolean,
  is_stackable: boolean,
  inventory_type: string,
  loot_type: string,
  contracts: boolean,
  expansion: string,
  stackable: number,
  profession_class: string,
  ticker: string,
  last_modified: number,
  connected_realm_id: number,
  iteration: number,
}

/**
 * Reagent Item Interface
 * extends Item & Pricing(Q) & implement value: number(0)
 */
export interface ReagentItemInterface
  extends LeanDocument<Item>, LeanDocument<ItemPricing> {
  _id: number;
  contracts: boolean;
  expansion: string;
  icon: string;
  ilvl: number;
  inventory_type: string;
  is_equippable: boolean;
  is_stackable: boolean;
  item_class: string;
  item_subclass: string;
  level: number;
  loot_type: string;
  name: ItemNames;
  profession_class: string;
  purchase_price: number;
  purchase_quantity: number;
  quality: string;
  sell_price: number;
  stackable: number;
  ticker: string;
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
  q_reagents_sum: number;
  q_derivatives_sum: number;
  premium_items: ReagentItemInterface[];
  reagent_items: ReagentItemInterface[];
  unsorted_items: ReagentItemInterface[];
  single_derivative: boolean;
  single_reagent: boolean;
  single_premium: boolean;
  premium_clearance: boolean
}
