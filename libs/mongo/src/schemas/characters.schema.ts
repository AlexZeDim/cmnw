import { Document, Schema as MongooseSchema, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LFG } from '@app/core';
/**
 * _id and id field represents Blizzard GUID name@realm-id
 * https://wow.gamepedia.com/GUID
 */

@Schema()
class Mount extends Document  {
  @Prop()
  _id: number;

  @Prop()
  name: string;
}

export const MountsSchema = SchemaFactory.createForClass(Mount);

@Schema()
class Pet extends Document  {
  @Prop()
  _id: number;

  @Prop()
  name: string;
}

export const PetsSchema = SchemaFactory.createForClass(Pet);

@Schema()
class Profession extends Document {
  @Prop()
  name: string;

  @Prop()
  tier: string;

  @Prop()
  id: number;

  @Prop()
  skill_points: number;

  @Prop()
  max_skill_points: number;

  @Prop()
  specialization: string;
}

export const ProfessionSchema = SchemaFactory.createForClass(Profession);

@Schema()
class RaidProgress extends Document {
  @Prop({ required: true })
  _id: string

  @Prop({ required: true })
  progress: string
}

export const RaidProgressSchema = SchemaFactory.createForClass(RaidProgress);

@Schema({ timestamps: true })
export class Character extends Document {
  @Prop({ required: true, lowercase: true })
  _id: string;

  @Prop()
  id: number;

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true })
  realm_id: number;

  @Prop({ required: true })
  realm_name: string;

  @Prop({  index: true, required: true })
  realm: string;

  @Prop()
  guild: string;

  @Prop({ lowercase: true, index: true })
  guild_id: string;

  @Prop()
  guild_guid: number;

  @Prop()
  guild_rank: number;

  @Prop({ index: true })
  hash_a: string;

  @Prop({ index: true })
  hash_b: string;

  @Prop()
  hash_f: string;

  @Prop()
  hash_t: string;

  @Prop()
  race: string;

  @Prop()
  character_class: string;

  @Prop()
  active_spec: string;

  @Prop()
  gender: string;

  @Prop()
  faction: string;

  @Prop()
  level: number;

  @Prop()
  achievement_points: number;

  @Prop()
  status_code: number;

  @Prop()
  average_item_level: number;

  @Prop()
  equipped_item_level: number;

  @Prop()
  chosen_covenant: string;

  @Prop()
  renown_level: number;

  @Prop({ default: Date.now() })
  last_modified: Date;

  @Prop()
  created_by: string;

  @Prop()
  updated_by: string;

  @Prop()
  avatar: string;

  @Prop()
  inset: string;

  @Prop()
  main: string;

  @Prop()
  personality: string;

  @Prop({ type: [MountsSchema] })
  mounts: Types.Array<Mount>;

  @Prop({ type: [PetsSchema] })
  pets:  Types.Array<Pet>;

  @Prop({ _id: false, type: [ProfessionSchema] })
  professions: Types.Array<Profession>;

  @Prop({ index: true, type: String, enum: LFG })
  looking_for_guild: string;

  @Prop()
  rio_score: number;

  @Prop()
  wcl_percentile: number;

  @Prop({ type: [RaidProgressSchema] })
  raid_progress: Types.Array<RaidProgress>;

  @Prop()
  battle_tag: string;

  @Prop()
  days_from: number;

  @Prop()
  days_to: number;

  @Prop()
  role: string;

  @Prop()
  transfer: boolean;

  @Prop({ type: [String] })
  languages: MongooseSchema.Types.Array;

  @Prop({ index: true })
  updatedAt: Date;

  @Prop()
  createdAt: Date;
}

export const CharactersSchema = SchemaFactory.createForClass(Character);
