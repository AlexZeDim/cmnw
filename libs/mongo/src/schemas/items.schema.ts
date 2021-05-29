import { Document, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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
export class Item extends Document {
  @Prop({ required: true })
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
