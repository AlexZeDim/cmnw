import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Key extends Document {
  @Prop()
  _id: string;

  @Prop({ required: true })
  secret: string;

  @Prop()
  token: string;

  @Prop()
  expired_in: number;

  @Prop({ type: [String] })
  tags: Types.Array<String>;
}

export const KeysSchema = SchemaFactory.createForClass(Key);
