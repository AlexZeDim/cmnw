import { Document, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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
export class Item extends Document {
  @Prop({ type: Number, required: true })
  _id: number;

  @Prop({ _id: false, timestamps: false })
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

  @Prop({ required: true, default: false })
  contracts: boolean;

  /** add via indexAssetClass - csv import */
  @Prop({ default: [], type: [String] })
  asset_class: Types.Array<String>;

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
  tags: Types.Array<String>;
}

export const ItemsSchema = SchemaFactory.createForClass(Item);
ItemsSchema.index({ 'expansion': 1 }, { name: 'C' })
ItemsSchema.index(
    {
    'ticker': 'text',
    'name.en_GB': 'text',
    'name.ru_RU': 'text',
    'tags': 'text'
  },
  {
    weights:
      {
        'ticker': 2,
        'name.en_GB': 2,
        'name.ru_RU': 2,
        'tags': 1
      },
    name: 'SQ',
  })
