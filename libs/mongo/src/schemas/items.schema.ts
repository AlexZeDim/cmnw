import { Document } from "mongoose";
import { Prop, SchemaFactory } from '@nestjs/mongoose';

class ItemNames {
  @Prop({ required: true })
  en_US: string;
  
  @Prop({ required: true })
  es_MX: string;
  
  @Prop({ required: true })
  pt_BR: string;
  
  @Prop({ required: true })
  de_DE: string;
  
  @Prop({ required: true })
  en_GB: string;
  
  @Prop({ required: true })
  es_ES: string;
  
  @Prop({ required: true })
  fr_FR: string;
  
  @Prop({ required: true })
  it_IT: string;
  
  @Prop({ required: true })
  ru_RU: string;
}

export class Item {
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
  
  @Prop({ required: true, default: [] })
  asset_class: mongoose.Types.Array<string>;
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
  
  @Prop({ required: true, default: [], })
  tags: mongoose.Types.Array<string>;
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
  