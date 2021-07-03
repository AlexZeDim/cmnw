import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FACTION } from '@app/core';

@Schema()
export class Gold extends Document {
  @Prop({ required: true })
  connected_realm_id: number;

  @Prop({ required: true, enum: FACTION })
  faction: string;

  @Prop()
  owner: string;

  @Prop()
  status: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  last_modified: number;
}

export const GoldsSchema = SchemaFactory.createForClass(Gold);
GoldsSchema.index({ last_modified: -1 }, { name: 'TTL', expireAfterSeconds: 86400 })
GoldsSchema.index({ status: 1, connected_realm_id: 1, last_modified: -1 }, { name: 'Q' })
