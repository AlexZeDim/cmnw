import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Realm } from '@app/mongo/schemas/realms.schema';
import { OSINT_SOURCE } from '@app/core';

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

  @Prop({ type: Number })
    id: number;

  @Prop({ type: String, required: true, index: true })
    name: string;

  @Prop({ type: String, required: true })
    realm: string;

  @Prop({ required: true, type: Number, ref: 'Realm' })
    realm_id: number | Realm;

  @Prop({ type: String, required: true })
    realm_name: string;

  @Prop({ type: String })
    faction: string;

  @Prop({ type: [GuildMembersSchema] })
    members: Types.Array<GuildMember>;

  @Prop({ type: Number })
    achievement_points: number;

  @Prop({ type: Number })
    member_count: number;

  @Prop({ type: Date, default: Date.now() })
    last_modified: Date;

  @Prop({ type: Date })
    created_timestamp: Date;

  @Prop({ type: Number })
    status_code: number;

  @Prop({ type: String, enum: OSINT_SOURCE })
    created_by: string;

  @Prop({ type: String, enum: OSINT_SOURCE })
    updated_by: string;

  @Prop({ type: Date, index: true })
    updatedAt: Date;

  @Prop({ type: Date })
    createdAt: Date;
}

export const GuildsSchema = SchemaFactory.createForClass(Guild);
