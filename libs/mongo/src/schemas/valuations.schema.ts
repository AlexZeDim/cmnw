import { Document, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FLAG_TYPE, VALUATION_TYPE } from '@app/core';
import { Item } from '@app/mongo/schemas/items.schema';

@Schema()
class ItemNames {
  @Prop()
  en_US: string;

  @Prop()
  es_MX: string;

  @Prop()
  pt_BR: string;

  @Prop()
  de_DE: string;

  @Prop()
  en_GB: string;

  @Prop()
  es_ES: string;

  @Prop()
  fr_FR: string;

  @Prop()
  it_IT: string;

  @Prop()
  ru_RU: string;
}

@Schema()
export class ItemValuations extends Item {
  @Prop({ type: Number, required: true })
  _id: number;

  @Prop({ _id: false, timestamps: false })
  name: ItemNames;

  @Prop()
  quality: string;

  @Prop()
  ilvl: number;

  @Prop()
  level: number;

  @Prop()
  icon: string;

  @Prop()
  item_class: string;

  @Prop()
  item_subclass: string;

  @Prop()
  purchase_price: number;

  @Prop()
  purchase_quantity: number;

  @Prop()
  sell_price: number;

  @Prop()
  is_equippable: boolean;

  @Prop()
  is_stackable: boolean;

  @Prop()
  inventory_type: string;

  @Prop()
  loot_type: string;

  @Prop({ required: true, default: false })
  contracts: boolean;
  /** add via indexAssetClass - csv import */

  @Prop({ default: [], type: [String] })
  asset_class: Types.Array<String>;
  /** add via importTaxonomy_CSV('itemsparse') */

  @Prop()
  expansion: string;

  @Prop()
  stackable: number;
  /** add via importTaxonomy_CSV('taxonomy') */

  @Prop()
  profession_class: string;

  @Prop()
  ticker: string;

  @Prop({ default: [], type: [String] })
  tags: Types.Array<String>;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  quantity: number;
}

const ItemValuationsSchema = SchemaFactory.createForClass(ItemValuations);

@Schema()
class Details {
  /**
   * PRVA
   * (weight index)
   */
  @Prop()
  wi: number;

  /**
   * CVA
   */
  @Prop()
  lot_size: number;

  @Prop()
  minimal_settlement_amount: number;

  /**
   * CVA || TVA
   */
  @Prop()
  quotation: string;

  @Prop()
  description: string;

  /**
   * TVA
   */
  @Prop()
  swap_type: string;

  /**
   * AVA
   */
  @Prop()
  min_price: number;

  @Prop()
  quantity: number;

  @Prop()
  open_interest: number;

  @Prop()
  orders: number[];

  /**
   * DVA
   */
  @Prop()
  rank: number;

  @Prop()
  queue_cost: number;

  @Prop()
  queue_quantity: number;

  @Prop()
  derivatives_cost: number;

  @Prop({ default: [], type: [ItemValuationsSchema] })
  reagent_items: Types.Array<ItemValuations>;

  @Prop({ default: [], type: [ItemValuationsSchema] })
  premium_reagent_items: Types.Array<ItemValuations>;

  @Prop({ default: [], type: [ItemValuationsSchema] })
  unsorted_reagent_items: Types.Array<ItemValuations>;
}

@Schema()
export class Valuations extends Document {
  @Prop({ required: true })
  item_id: number;

  @Prop({ required: true })
  connected_realm_id: number;

  @Prop({ required: true })
  last_modified: number;

  @Prop({ required: true })
  value: number;

  @Prop()
  name: string;

  @Prop({ enum: FLAG_TYPE })
  flag: string;

  @Prop({ enum: VALUATION_TYPE })
  type: string;

  @Prop({ type: Details })
  details: Details;
}

export const ValuationsSchema = SchemaFactory.createForClass(Valuations);


//TODO to lowercase or uppercase asset classes, flag and types
