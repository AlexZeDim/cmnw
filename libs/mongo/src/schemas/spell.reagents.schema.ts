import { Document } from "mongoose";
import { Prop, SchemaFactory } from '@nestjs/mongoose';

/**
 *  TODO description
 *  Effect - effect flag
 *  EffectItemType - item_id
 *  EffectBasePointsF - item_quantity
 *  spellID - spell_id
 */

class Item {
  @Prop({ required: true })
  _id: number;
  
  @Prop({ required: true })
  quantity: number;
}

export class SpellReagents {
  @Prop({ required: true })
  _id: number;
  
  @Prop({ required: true, index: true })
  spell_id: number;
  
  @Prop({ required: true, default: [] })
  reagents: mongoose.Types.Array<Item>;
}

export const SpellReagentsSchema = SchemaFactory.createForClass(SpellReagents);
