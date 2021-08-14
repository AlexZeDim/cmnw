import { Document, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Protocol } from 'puppeteer';
import Item = Protocol.DOMStorage.Item;

/**
 *  TODO description
 *  Effect - effect flag
 *  EffectItemType - item_id
 *  EffectBasePointsF - item_quantity
 *  spellID - spell_id
 */

@Schema()
class ItemReagent {
  @Prop({ type: Number, required: true })
  _id: number;

  @Prop({ required: true })
  quantity: number;
}

const ItemSchema = SchemaFactory.createForClass(ItemReagent);

@Schema()
export class SpellReagents extends Document {
  @Prop({ type: Number, required: true })
  _id: number;

  @Prop({ required: true, index: true })
  spell_id: number;

  @Prop({ default: [], type: [ItemSchema], ref: 'Item' })
  reagents: Types.Array<ItemReagent | Item>;
}

export const SpellReagentsSchema = SchemaFactory.createForClass(SpellReagents);
