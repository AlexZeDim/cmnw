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

  @Prop({ type: String, enum: LANG })
  language: LANG;

  @Prop({ type: Number, default: 0 })
  tolerance: number;

  @Prop({ type: Number, default: 0 })
  timestamp: number;

  /**
   * Subscription FILTERS
   */
  @Prop({ default: [], type: [Number], ref: 'Item' })
  items: number[] | Item[];

  @Prop({ type: [RealmConnectedSchema], ref: 'Realm' })
  realms: MongooseSchema.Types.Array;

  @Prop({ type: [String], default: [] })
  character_class: MongooseSchema.Types.Array;

  @Prop()
  days_from: number;

  @Prop()
  days_to: number;

  @Prop()
  average_item_level: number;

  @Prop()
  rio_score: number;

  @Prop()
  wcl_percentile: number;

  @Prop({ type: String, enum: FACTION })
  faction: FACTION;

  @Prop({ type: [String] })
  languages: MongooseSchema.Types.Array;
}

export const SubscriptionsSchema = SchemaFactory.createForClass(Subscription);
