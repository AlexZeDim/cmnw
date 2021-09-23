import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FACTION, LANG, NOTIFICATIONS } from '@app/core';
import { Item } from '@app/mongo/schemas/items.schema';

@Schema()
export class RealmConnected extends Document {
  @Prop()
  _id: number;

  @Prop()
  auctions: number;

  @Prop()
  golds: number;

  @Prop()
  valuations: number;
}

export const RealmConnectedSchema = SchemaFactory.createForClass(RealmConnected);

@Schema({ timestamps: true })
export class Subscription extends Document {
  @Prop({ type: String, required: true })
  discord_id: string;

  @Prop({ type: String, required: true })
  discord_name: string;

  @Prop({ type: String, required: true })
  channel_id: string;

  @Prop({ type: String, required: true })
  channel_name: string;

  @Prop({ type: String, required: true })
  author_id: string;

  @Prop({ type: String, required: true })
  author_name: string;

  @Prop({ type: String, required: true, enum: NOTIFICATIONS })
  type: NOTIFICATIONS;

  @Prop({ type: Number, default: 0 })
  tolerance: number;

  @Prop({ type: Number, default: 0 })
  timestamp: number;
  /**
   * Subscription
   * CANDIDATES
   */
  @Prop({ type: String })
  character_class: string;

  @Prop({ type: Number })
  days_from: number;

  @Prop({ type: Number })
  days_to: number;

  @Prop({ type: Number })
  item_level: number;

  @Prop({ type: Number })
  rio_score: number;

  @Prop({ type: Number })
  wcl_percentile: number;

  @Prop({ type: String, enum: FACTION })
  faction: FACTION;

  @Prop({ type: String })
  languages: string;
  /**
   * Subscription
   * MARKET & ORDERS
   */
  @Prop({ default: [], type: [Number], ref: 'Item' })
  items: number[] | Item[];

  @Prop({ type: Number, ref: 'Realm' })
  realms: number; // TODO both ways
}

export const SubscriptionsSchema = SchemaFactory.createForClass(Subscription);
