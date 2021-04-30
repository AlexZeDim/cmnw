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
  @Prop({ type: Number, required: true })
  _id: number;

  @Prop({ required: true })
  quantity: number;
}

const ItemSchema = SchemaFactory.createForClass(Item);

@Schema()
export class SpellReagents extends Document {
  @Prop({ type: Number, required: true })
  _id: number;

  @Prop({ required: true, index: true })
  spell_id: number;

  @Prop({ default: [], type: [ItemSchema] })
  reagents: Types.Array<Item>;
}

export const SpellReagentsSchema = SchemaFactory.createForClass(SpellReagents);
