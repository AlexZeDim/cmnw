import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 *  TODO description
 *  Effect - effect flag
 *  EffectItemType - item_id
 *  EffectBasePointsF - item_quantity
 *  spellID - spell_id
 */

@Schema()
export class SpellEffect extends Document {
  @Prop({ required: true })
  _id: number;

  @Prop({ required: true })
  effect: number;

  @Prop({ required: true, index: true })
  item_id: number;

  @Prop({ required: true })
  item_quantity: number;

  @Prop({ required: true, index: true })
  spell_id: number;
}

export const SpellEffectSchema = SchemaFactory.createForClass(SpellEffect);
