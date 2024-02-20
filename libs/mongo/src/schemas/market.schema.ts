import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MARKET_TYPE } from '@app/core';

@Schema({ timestamps: true })
export class Market extends Document {
  @Prop({ type: Number, required: true })
  id: number;

  @Prop({ type: Number, required: true })
  itemId: number;

  @Prop({ type: Number })
  connectedRealmId: number;

  @Prop({ default: 1, type: Number })
  quantity: number;

  @Prop({ type: Number })
  bid: number;

  @Prop({ type: Number })
  buyout: number;

  @Prop({ type: Number })
  price: number;

  @Prop({ type: Number })
  value: number;

  @Prop({ type: String })
  timeLeft: string;

  @Prop({ type: String })
  faction: string;

  @Prop({ type: String })
  counterparty: string;

  @Prop({ type: Boolean })
  isOnline: boolean;

  @Prop({ type: String, enum: MARKET_TYPE, default: MARKET_TYPE.A })
  type?: MARKET_TYPE;

  @Prop({ type: Number, required: true })
  timestamp: number;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export const AuctionsSchema = SchemaFactory.createForClass(Market);
AuctionsSchema.index({ createdAt: -1 }, { name: 'TTL', expireAfterSeconds: 86400 });
AuctionsSchema.index(
  { connected_realm_id: -1, item_id: -1, last_modified: -1 },
  { name: 'TSqPL' },
);
