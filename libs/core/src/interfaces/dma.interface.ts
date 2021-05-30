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

export interface RealmChartInterface {
  realms: string[];
  connected_realm_id: number;
  golds: number;
  auctions: number;
}

