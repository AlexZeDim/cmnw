import { Document } from "mongoose";
import { Prop, SchemaFactory } from '@nestjs/mongoose';


export class Auction {
  @Prop({ required: true })
  id: number;

  @Prop({ required: true })
  item_id: number;

  @Prop()
  item: any; //TODO

  @Prop({ required: true })
  connected_realm_id: number;

  @Prop({ required: true })
  last_modified: number;
  
  @Prop()
  quantity: number;
  
  @Prop()
  bid: number;
  
  @Prop()
  buyout: number;
  
  @Prop()
  price: number;
  
  @Prop()
  time_left: string;
}

export const AuctionsShema = SchemaFactory.createForClass(Auction);
AuctionsShema.index({ 'createdAt': -1 }, { name: 'TTL', expireAfterSeconds: 86400 })
AuctionsShema.index({ 'connected_realm_id': 1, 'last_modified': -1 }, { name: 'TS' })
AuctionsShema.index({ 'item_id': -1, 'connected_realm_id': 1 }, { name: 'Q' })
AuctionsShema.index({ 'last_modified': -1, 'item_id': -1, 'connected_realm_id': 1 }, { name: 'PL' })

