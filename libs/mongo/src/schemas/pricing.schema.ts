import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
class Item {
  @Prop({ required: true })
  _id: number;

  @Prop({ required: true, default: 0 })
  quantity: number;
}

@Schema()
class ModifiedCraftingSlot {
  @Prop({ required: true })
  _id: number;
}

@Schema()
class Locales {
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

  @Prop()
  ko_KR: string;

  @Prop()
  zh_TW: string;

  @Prop()
  zh_CN: string;
}

@Schema()
export class Pricing extends Document {
  @Prop()
  ticker: string;

  @Prop({ _id: false, timestamp: false })
  name: Locales;

  @Prop({ _id: false, timestamp: false })
  description: Locales;

  @Prop()
  faction: string;

  @Prop()
  media: string;
  /**
   * API or LOCAL
   *
   * SkillLineAbility.lua
   * see https://us.forums.blizzard.com/en/blizzard/t/bug-professions-api/6234 for details
   *
   * Build from item_id & item_quantity
   * for massive Proportion evaluation
   * {id: Number, Quantity: Number}
   */

  @Prop({ required: true, default: [] })
  derivatives: Types.Array<Item>;

  @Prop({ required: true, default: [] })
  reagents: Types.Array<Item>;

  @Prop({ required: true, default: [], index: true })
  recipe_id: number;

  @Prop({ index: true })
  spell_id: number;

  @Prop({ default: [] })
  modified_crafting_slots: ModifiedCraftingSlot[];
  /** if Local then Convert from SkillLine */

  @Prop()
  profession: string;
  /** API */

  @Prop()
  expansion: string;

  @Prop()
  rank: number;

  @Prop({ required: true }) //enum: PricingType
  type: string;

  @Prop({ required: true, default: false })
  single_premium: boolean;

  @Prop()
  create_by: string;

  @Prop()
  updated_by: string;
}

export const PricingSchema = SchemaFactory.createForClass(Pricing);
PricingSchema.index({ 'derivatives._id': -1, 'type': 1 }, { name: 'GET' })
