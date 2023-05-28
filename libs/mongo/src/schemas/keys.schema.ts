import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Key extends Document {
  @Prop({ type: String })
    _id: string;

  @Prop({ type: String, required: true })
    secret: string;

  @Prop({ type: String })
    token: string;

  @Prop({ type: Number })
    expiresIn: number;

  @Prop({ type: [String] })
    tags: Types.Array<String>;
}

export const KeysSchema = SchemaFactory.createForClass(Key);
