import { Document } from "mongoose";
import { Prop, SchemaFactory } from '@nestjs/mongoose';

export type KeyDocument = Key & Document;

export class Key {
  @Prop()
  _id: string;

  @Prop({ required: true })
  secret: string;

  @Prop()
  token: string;

  @Prop()
  expired_in: number;

  @Prop()
  tags: string[];
}

export const KeysSchema = SchemaFactory.createForClass(Key);
