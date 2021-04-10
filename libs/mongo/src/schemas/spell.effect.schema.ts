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
  _idProp: number;

  @Prop({ required: true })
  effectProp: number;

  @Prop({ required: true, index: true })
  item_idProp: number;

  @Prop({ required: true })
  item_quantityProp: number;

  @Prop({ required: true, index: true })
  spell_idProp: number;
}

export const SpellEffectSchema = SchemaFactory.createForClass(SpellEffect);
