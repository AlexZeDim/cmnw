import { Document, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 *  TODO description
 *  Effect - effect flag
 *  EffectItemType - item_id
 *  EffectBasePointsF - item_quantity
 *  spellID - spell_id
 */

@Schema()
class Item {
  @Prop({ required: true })
  _id: number;

  @Prop({ required: true })
  quantity: number;
}

export class SpellReagents extends Document {
  @Prop({ required: true })
  _id: number;

  @Prop({ required: true, index: true })
  spell_id: number;

  @Prop({ required: true, default: [] })
  reagents: Types.Array<Item>;
}

export const SpellReagentsSchema = SchemaFactory.createForClass(SpellReagents);
