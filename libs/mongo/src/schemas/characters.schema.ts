import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LFG_STATUS, OSINT_SOURCE } from '@app/core';
import { Guild } from '@app/mongo/schemas/guilds.schema';
import { Realm } from '@app/mongo/schemas/realms.schema';

/**
 * _id and id field represents Blizzard GUID name@realm-id
 * https://wow.gamepedia.com/GUID
 */
@Schema()
class Mount extends Document {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String })
  name: string;
}

export const MountsSchema = SchemaFactory.createForClass(Mount);

@Schema()
class Pet extends Document {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String })
  name: string;
}

export const PetsSchema = SchemaFactory.createForClass(Pet);

@Schema()
class Profession extends Document {
  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  tier: string;

  @Prop({ type: Number })
  id: number;

  @Prop({ type: Number })
  skill_points: number;

  @Prop({ type: Number })
  max_skill_points: number;

  @Prop({ type: String })
  specialization: string;
}

export const ProfessionSchema = SchemaFactory.createForClass(Profession);

@Schema()
class RaidProgress extends Document {
  @Prop({ required: true, type: String })
  _id: string;

  @Prop({ required: true, type: String })
  progress: string;
}

export const RaidProgressSchema = SchemaFactory.createForClass(RaidProgress);

@Schema({ timestamps: true })
export class Character extends Document {
  @Prop({ required: true, lowercase: true, type: String })
  _id: string;

  @Prop({ type: Number })
  id: number;

  @Prop({ required: true, index: true, type: String })
  name: string;

  @Prop({ required: true, type: Number, ref: 'Realm' })
  realm_id: number | Realm;

  @Prop({ required: true, type: String })
  realm_name: string;

  @Prop({ index: true, required: true, type: String })
  realm: string;

  @Prop({ type: String })
  guild: string;

  @Prop({ type: String, lowercase: true, index: true, ref: 'Guild' })
  guild_id: string | Guild;

  @Prop({ type: Number })
  guild_guid: number;

  @Prop({ type: Number })
  guild_rank: number;

  @Prop({ index: true, type: String })
  hash_a: string;

  @Prop({ index: true, type: String })
  hash_b: string;

  @Prop({ type: String })
  hash_f: string;

  @Prop({ type: String })
  hash_t: string;

  @Prop({ type: String })
  race: string;

  @Prop({ type: String })
  character_class: string;

  @Prop({ type: String })
  active_spec: string;

  @Prop({ type: String })
  gender: string;

  @Prop({ type: String })
  faction: string;

  @Prop({ type: Number, index: true })
  level: number;

  @Prop({ type: Number, index: true })
  achievement_points: number;

  @Prop({ type: Number })
  status_code: number;

  @Prop({ type: Number })
  average_item_level: number;

  @Prop({ type: Number })
  equipped_item_level: number;

  @Prop({ type: String })
  chosen_covenant: string;

  @Prop({ type: Number })
  renown_level: number;

  @Prop({ default: Date.now() })
  last_modified: Date;

  @Prop({ type: String, enum: OSINT_SOURCE })
  created_by: string;

  @Prop({ type: String, enum: OSINT_SOURCE })
  updated_by: string;

  @Prop({ type: String })
  avatar: string;

  @Prop({ type: String })
  inset: string;

  @Prop({ type: String })
  main: string;

  @Prop({ type: String })
  personality: string;

  @Prop({ type: [MountsSchema] })
  mounts: Types.Array<Mount>;

  @Prop({ type: Number, index: true })
  mounts_score: number;

  @Prop({ type: [PetsSchema] })
  pets: Types.Array<Pet>;

  @Prop({ type: Number, index: true })
  pets_score: number;

  @Prop({ _id: false, type: [ProfessionSchema] })
  professions: Types.Array<Profession>;

  @Prop({ index: true, type: String, enum: LFG_STATUS })
  looking_for_guild: string;

  @Prop({ type: Number })
  rio_score: number;

  @Prop({ type: Number })
  wcl_percentile: number;

  @Prop({ type: [RaidProgressSchema] })
  raid_progress: Types.Array<RaidProgress>;

  @Prop({ type: String })
  battle_tag: string;

  @Prop({ type: Number })
  days_from: number;

  @Prop({ type: Number })
  days_to: number;

  @Prop({ type: String })
  role: string;

  @Prop({ type: Boolean })
  transfer: boolean;

  @Prop({ type: [String] })
  languages: MongooseSchema.Types.Array;

  @Prop({ type: Date, index: true })
  updatedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export const CharactersSchema = SchemaFactory.createForClass(Character);
