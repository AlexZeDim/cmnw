import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Token extends Document {
  @Prop({ required: true })
  _id: number;

  @Prop({ required: true })
  region: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  last_modified: number;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
