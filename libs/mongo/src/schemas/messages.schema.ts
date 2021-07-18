import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CLEARANCE, SOURCE_TYPE } from '@app/core';

@Schema()
class Source {
  @Prop({ type: String, enum: SOURCE_TYPE })
  type: string;

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

  @Prop({ type: [String], enum: CLEARANCE })
  clearance: Types.Array<String>

  @Prop({ type: String })
  context: string;

  @Prop({ _id: false, timestamps: false })
  source: Source;
}

export const MessagesSchema = SchemaFactory.createForClass(Message);
