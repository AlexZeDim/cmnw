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
