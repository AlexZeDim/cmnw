import { Document, ObjectId, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FLAG_TYPE, VALUATION_TYPE } from '@app/core';
import { Item } from '@app/mongo/schemas/items.schema';

@Schema()
class ItemNames {
  @Prop({ type: String })
  en_US: string;

  @Prop({ type: String })
  es_MX: string;

  @Prop({ type: String })
  pt_BR: string;

  @Prop({ type: String })
  de_DE: string;

  @Prop({ type: String })
  en_GB: string;

  @Prop({ type: String })
  es_ES: string;

  @Prop({ type: String })
  fr_FR: string;

  @Prop({ type: String })
  it_IT: string;

  @Prop({ type: String })
  ru_RU: string;
}

@Schema()
export class ItemValuations extends Item {
  @Prop({ type: Number, required: true })
  _id: number;

  @Prop({ _id: false, type: ItemNames, timestamps: false })
  name: ItemNames;

  @Prop({ type: String })
  quality: string;

  @Prop({ type: Number })
  ilvl: number;

  @Prop({ type: Number })
  level: number;

  @Prop({ type: String })
  icon: string;

  @Prop({ type: String })
  item_class: string;

  @Prop({ type: String })
  item_subclass: string;

  @Prop({ type: Number })
  purchase_price: number;

  @Prop({ type: Number })
  purchase_quantity: number;

  @Prop({ type: Number })
  sell_price: number;

  @Prop({ type: Boolean })
  is_equippable: boolean;

  @Prop({ type: Boolean })
  is_stackable: boolean;

  @Prop({ type: String })
  inventory_type: string;

  @Prop({ type: String })
  loot_type: string;

  @Prop({ type: Boolean, required: true, default: false })
  contracts: boolean;
  /** add via indexAssetClass - csv import */

  @Prop({ default: [], type: [String] })
  asset_class: Types.Array<string>;
  /** add via importTaxonomy_CSV('itemsparse') */

  @Prop({ type: String })
  expansion: string;

  @Prop({ type: Number })
  stackable: number;
  /** add via importTaxonomy_CSV('taxonomy') */

  @Prop({ type: String })
  profession_class: string;

  @Prop({ type: String })
  ticker: string;

  @Prop({ default: [], type: [String] })
  tags: Types.Array<string>;

  @Prop({ type: Number, required: true })
  value: number;

  @Prop({ type: Number, required: true })
  quantity: number;
}

const ItemValuationsSchema = SchemaFactory.createForClass(ItemValuations);

@Schema()
class Details {
  /**
   * PRVA
   * (weight index)
   */
  @Prop({ type: Number })
  wi: number;

  /**
   * CVA
   */
  @Prop({ type: Number })
  lot_size: number;

  @Prop({ type: Number })
  minimal_settlement_amount: number;

  /**
   * CVA || TVA
   */
  @Prop({ type: String })
  quotation: string;

  @Prop({ type: String })
  description: string;

  /**
   * TVA
   */
  @Prop({ type: String })
  swap_type: string;

  /**
   * AVA
   */
  @Prop({ type: Number })
  min_price: number;

  @Prop({ type: Number })
  quantity: number;

  @Prop({ type: Number })
  open_interest: number;

  @Prop({ type: [Number] })
  orders: number[];

  /**
   * DVA
   */
  @Prop({ type: Number })
  rank: number;

  @Prop({ type: Number })
  queue_cost: number;

  @Prop({ type: Number })
  queue_quantity: number;

  @Prop({ type: Number })
  derivatives_cost: number;

  @Prop({ default: [], type: [ItemValuationsSchema], ref: 'Item' })
  reagent_items: Types.Array<ItemValuations>;

  @Prop({ default: [], type: [ItemValuationsSchema], ref: 'Item' })
  premium_reagent_items: Types.Array<ItemValuations>;

  @Prop({ default: [], type: [ItemValuationsSchema], ref: 'Item' })
  unsorted_reagent_items: Types.Array<ItemValuations>;
}

@Schema()
export class Valuations extends Document {
  @Prop({ required: true, type: Number, ref: 'Item' })
  item_id: number | Item;

  @Prop({ required: true, type: Number, ref: 'Realm' })
  connected_realm_id: number;

  @Prop({ type: Number, required: true })
  last_modified: number;

  @Prop({ type: Types.ObjectId })
  pricing_method: ObjectId;

  @Prop({ type: Number, required: true })
  value: number;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String, enum: FLAG_TYPE, uppercase: true })
  flag: string;

  @Prop({ type: String, enum: VALUATION_TYPE, lowercase: true })
  type: string;

  @Prop({ type: Details })
  details: Details;
}

export const ValuationsSchema = SchemaFactory.createForClass(Valuations);

ValuationsSchema.index(
  {
    item_id: 1,
    last_modified: 1,
    connected_realm_id: 1,
    type: 1,
  },
  {
    name: 'SQ',
  },
);
