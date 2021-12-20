import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CLEARANCE_LEVEL, SOURCE_TYPE } from '@app/core';

@Schema()
export class Source {
  @Prop({ type: String, enum: SOURCE_TYPE, default: SOURCE_TYPE.DiscordText })
  message_type: SOURCE_TYPE;

  @Prop({ type: String })
  author: string;

  @Prop({ type: String })
  discord_author: string;

  @Prop({ type: String })
  discord_author_id: string;

  @Prop({ type: String })
  discord_server: string;

  @Prop({ type: String })
  discord_server_id: string;

  @Prop({ type: String })
  discord_channel: string;

  @Prop({ type: String })
  discord_channel_id: string;
}

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: [String] })
  tags: Types.Array<String>

  @Prop({ type: [String], enum: CLEARANCE_LEVEL, default: [CLEARANCE_LEVEL.COMMUNITY] })
  clearance: Types.Array<String>

  @Prop({ type: String })
  subject: string;

  @Prop({ type: String, required: true })
  context: string;

  @Prop({ _id: false, timestamps: false })
  source: Source;
}

export const MessagesSchema = SchemaFactory.createForClass(Message);
