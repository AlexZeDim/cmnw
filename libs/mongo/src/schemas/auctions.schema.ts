import { Document, Mixed, SchemaTypes } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Auction extends Document {
  @Prop({ type: Number, required: true })
    id: number;

  @Prop({ type: Number, required: true, ref: 'Item' })
    item_id: number;

  @Prop({ type: SchemaTypes.Mixed })
    item: Mixed;

  @Prop({ type: Number, ref: 'Realm' })
    connected_realm_id: number;

  @Prop({ type: Number, required: true })
    last_modified: number;

  @Prop({ type: Number })
    quantity: number;

  @Prop({ type: Number })
    bid: number;

  @Prop({ type: Number })
    buyout: number;

  @Prop({ type: Number })
    price: number;

  // TODO enum?
  @Prop({ type: String })
    time_left: string;

  @Prop({ type: Date })
    updatedAt: Date;

  @Prop({ type: Date })
    createdAt: Date;
}

export const AuctionsSchema = SchemaFactory.createForClass(Auction);
AuctionsSchema.index({ 'createdAt': -1 }, { name: 'TTL', expireAfterSeconds: 86400 });
AuctionsSchema.index({ 'connected_realm_id': -1, 'item_id': -1, 'last_modified': -1  }, { name: 'TSqPL' });

