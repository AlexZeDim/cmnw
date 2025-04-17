import { Model } from 'mongoose';
import { Market } from '@app/mongo';
import { ItemPricing } from '@app/mongo/schemas/pricing.schema';
import { ItemsEntity } from '@app/pg';
import {
  INameWithType,
  ISelfKeyHref,
  ISelfWithId,
  ISelfWithNameAndId,
} from '@app/core/types';

export interface IItemFieldMap {
  key: Partial<keyof Omit<ItemsEntity, 'id'>>;
  path: string;
}

export interface ItemNames {
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

export interface IActionsModifier {
  type: number;
  value: number;
}

export interface IPetList {
  petBreedId: number;
  petLevel: number;
  petQualityId: number;
  petSpeciesId: number;
}

export interface IAuctionsItem {
  id: number;
  context: number;
  bonus_lists: number[];
  modifiers: Array<IActionsModifier>;
  pet_breed_id: number;
  pet_level: number;
  pet_quality_id: number;
  pet_species_id: number;
}

export interface IAuctionsOrder {
  id: number;
  item: IAuctionsItem;
  bid: number;
  buyout: number;
  quantity: number;
  time_left: string;
  // extend by transformOrders
  // item_id?: number;
  // price?: number;
  // connected_realm_id: number;
  // last_modified?: number;
}

export interface ICommodityOrder {
  id: number;
  item: { id: number };
  quantity: number;
  unit_price: number;
  time_left: string;
}

export interface IAuctions {
  auctions: Array<IAuctionsOrder | ICommodityOrder>;
  lastModified: string;
}

export interface IQItemValuation {
  _id: number;
  last_modified: number;
  connected_realm_id: number;
  iteration: number;
}

export class IAAuctionOrder {
  readonly id: number;
  readonly quantity: number;
  readonly price?: number;
  readonly bid?: number;
  readonly buyout?: number;
}

export class IAAuctionOrders {
  readonly _id: number;
  readonly orders_t0: IAAuctionOrder[];
  readonly orders_t1: IAAuctionOrder[];
}

export class IQPricing {
  readonly recipe_id: number;
  readonly profession: string | number;
  readonly expansion: string;
  readonly region: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly accessToken: string;
}

export interface IQItem {
  itemId: number;
}

export interface IQAuction {
  connectedRealmId: number;
  auctionsTimestamp: number;
  commoditiesTimestamp: number;
  isAssetClassIndex: boolean;
}

/**
 * Value Adjustable Class
 * argument for evaluation functions
 */
export class IVAItem implements IQItemValuation {
  readonly _id: number;

  readonly name: ItemNames;

  readonly quality: string;

  readonly asset_class: string[];

  readonly tags: string[];

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

export interface IItem {
  id: number;
  name: ItemNames;
  quality: INameWithType;
  level: number;
  required_level: number;
  media: ISelfWithId;
  item_class: ISelfWithNameAndId;
  item_subclass: ISelfWithNameAndId;
  inventory_type: INameWithType;
  purchase_price: number;
  sell_price: number;
  max_count: number;
  is_equippable: boolean;
  is_stackable: boolean;
  preview_item: any;
  purchase_quantity: number;
  loot_type: string;
  // modified_crafting: any;
  lastModified: string;
}

export interface IItemMedia {
  _links: {
    self: ISelfKeyHref;
  };
  assets: Array<IItemMediaAssets>;
  id: number;
  lastModified: string;
}

export interface IItemMediaAssets {
  key: 'icon';
  value: string;
  file_data_id: number;
}

export interface IPricing {
  recipe_id: number;
  expansion: string;
  profession: number;
}

export interface IPricingMethods {
  faction?: string;
  recipe_id: number;
  reagents: Record<string, any>[];
  item_id: number;
  expansion: string;
  item_quantity: number;
}

export interface IChartOrder {
  lt: number;
  x: number;
  y: number;
  orders: number;
  value: number;
  price: number;
  oi: number;
}

export interface IOrderQuotes {
  readonly id: number;
  readonly price: number;
  readonly quantity: number;
  readonly open_interest: number;
  readonly size: number;
}

export interface IOrderXrs {
  _id: string | number;
  xIndex: number;
  orders: number;
  value: number;
  oi: number;
  price: number;
}

export interface IARealm {
  readonly _id: number;
  readonly realms: string[];
  readonly slug: string;
  readonly connected_realm_id: number;
  readonly golds: number;
  readonly auctions: number;
  readonly valuations: number;
}

export interface IAARealm {
  readonly _id: {
    readonly connected_realm_id: number;
    readonly auctions: number;
  };
  readonly name: string;
}

export interface IVARealm {
  readonly _id: number;
  readonly auctions: number;
  readonly valuations: number;
}

export interface IVAAuctions {
  readonly _id: number;
  readonly data: Market;
}

export interface IGold {
  orderId: string;
  realm: string;
  faction: string;
  status: boolean;
  quantity: string;
  owner: string;
  price: string;
}

/**
 * Market Data Response from aggregation
 * for Auction Valuation Adjustable
 */
export interface IMarketData {
  _id: number;
  quantity: number;
  open_interest: number;
  value: number;
  min: number;
  orders: number[];
}

export interface ContractAggregation {
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
export class IReagentItem implements ItemPricing {
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

  readonly asset_class: Array<string>;

  readonly tags: Array<string>;
  // ItemPricing
  quantity: number;
  // Implement Value
  value: number;
}

export interface ICsvReagents {
  readonly _id: number;
  readonly quantity: number;
}

export interface IBuildYAxis {
  readonly itemId: number;
  readonly isGold: boolean;
}

export interface IGetCommdtyOrders {
  readonly model: Model<Market>;
  readonly itemId?: number;
  readonly connectedRealmId?: number;
  readonly timestamp?: number;
}

export class MethodEvaluation {
  queue_cost: number;

  derivatives_cost: number;

  premium: number;

  nominal_value: number;

  nominal_value_draft: number;

  reagent_quantity_sum: number;

  derivative_quantity_sum: number;

  premium_items: IReagentItem[];

  reagent_items: IReagentItem[];

  unsorted_items: IReagentItem[];

  single_derivative: boolean;

  single_reagent: boolean;

  single_premium: boolean;

  premium_clearance: boolean;
}

export interface IWowToken {
  last_updated_timestamp: number;
  price: number;
  lastModified: string;
}

export interface IItemsParse {
  ID: number;
  Stackable: number;
  ExpansionID: number;
}
