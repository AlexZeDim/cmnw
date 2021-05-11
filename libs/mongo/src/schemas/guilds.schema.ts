import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
class GuildMember {
  @Prop({ type: String, required: true, lowercase: true })
  _id: string;

  @Prop({ required: true })
  id: number;

  @Prop({ required: true })
  rank: number;
}

export const GuildMembersSchema = SchemaFactory.createForClass(GuildMember);

@Schema({ timestamps: true })
export class Guild extends Document {
  @Prop({ type: String, required: true, lowercase: true })
  _id: string;

  @Prop()
  id: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  realm: string;

  @Prop({ required: true })
  realm_id: number;

  @Prop({ required: true })
  realm_name: string;

  @Prop()
  faction: string;

  @Prop({ type: [GuildMembersSchema] })
  members: Types.Array<GuildMember>

  @Prop()
  achievement_points: number;

  @Prop()
  member_count: number;

  @Prop({ type: Date, default: Date.now() })
  last_modified: Date;

  @Prop({ type: Date })
  created_timestamp: Date;

  @Prop()
  status_code: number;

  @Prop()
  created_by: string;

  @Prop()
  updated_by: string;

  @Prop({ index: true })
  updatedAt: Date;

  @Prop()
  createdAt: Date;
}

export const GuildsSchema = SchemaFactory.createForClass(Guild);
