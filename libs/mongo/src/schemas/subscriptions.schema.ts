import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LANG, NOTIFICATIONS } from '@app/core';

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
  timestamp: number;

  @Prop({ type: String, enum: LANG })
  language: LANG;

  // TODO filters
}

export const SubscriptionsSchema = SchemaFactory.createForClass(Subscription);
