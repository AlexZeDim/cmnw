import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Item } from '@app/mongo/schemas/items.schema';
import { PRICING_TYPE } from '@app/core';

@Schema()
export class ItemPricing {
  @Prop({ required: true })
    _id: number;

  @Prop({ required: true, default: 0 })
    quantity: number;
}

const ItemSchema = SchemaFactory.createForClass(ItemPricing);

@Schema()
export class ModifiedCraftingSlot {
  @Prop({ required: true })
    _id: number;
}

const ModifiedCraftingSlotSchema = SchemaFactory.createForClass(ModifiedCraftingSlot);

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
  @Prop({ type: String })
    ticker: string;

  @Prop({ _id: false, timestamp: false })
    name: Locales;

  @Prop({ _id: false, timestamp: false })
    description: Locales;

  @Prop({ type: String })
    faction: string;

  @Prop({ type: String })
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
  @Prop({ default: [], type: [ItemSchema], ref: 'Item' })
    derivatives: Types.Array<ItemPricing>;

  @Prop({ default: [], type: [ItemSchema], ref: 'Item' })
    reagents: Types.Array<ItemPricing>;

  // TODO cover ref?
  @Prop({ required: true, index: true })
    recipe_id: number;

  @Prop({ index: true })
    spell_id: number;

  @Prop({ default: [], type: [ModifiedCraftingSlotSchema] })
    modified_crafting_slots:  Types.Array<ModifiedCraftingSlot>;

  /** if Local then Convert from SkillLine */
  @Prop({ type: String })
    profession: string;

  /** API */
  @Prop({ type: String })
    expansion: string;

  @Prop({ type: Number })
    rank: number;

  @Prop({ required: true, type: String, enum: PRICING_TYPE })
    type: string;

  @Prop({ type: Number })
    single_premium: number;

  @Prop({ type: String })
    create_by: string;

  @Prop({ type: String })
    updated_by: string;
}

export const PricingSchema = SchemaFactory.createForClass(Pricing);
PricingSchema.index({ 'derivatives._id': -1, 'type': 1 }, { name: 'GET' });
