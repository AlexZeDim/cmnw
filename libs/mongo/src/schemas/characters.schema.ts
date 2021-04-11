import { Document, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
/**
 * _id and id field represents Blizzard GUID name@realm-id
 * https://wow.gamepedia.com/GUID
 */

@Schema()
class Mount {
  @Prop()
  _id: number;

  @Prop()
  name: string;
}

@Schema()
class Pet {
  @Prop()
  _id: number;

  @Prop()
  name: string;
}

@Schema()
class Profession {
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

@Schema()
class RaidProgress {
  @Prop({ required: true })
  _id: string

  @Prop({ required: true })
  progress: string
}

@Schema()
class LookingForGroup {
  @Prop({ index: true })
  status: boolean;

  @Prop()
  new: boolean;
}

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

  @Prop({ required: true })
  realm: string;

  @Prop()
  guild: string;

  @Prop({ lowercase: true, index: true })
  guild_id: string;

  @Prop()
  guild_guid: number;

  @Prop()
  guild_rank: number;

  @Prop()
  hash_a: string;

  @Prop()
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

  @Prop()
  mounts: Types.Array<Mount>;

  @Prop()
  pets: Types.Array<Pet>;

  @Prop({ _id: false })
  professions: Types.Array<Profession>;

  @Prop()
  lfg: LookingForGroup;

  @Prop()
  rio_score: number;

  @Prop()
  wcl_percentile: number;

  @Prop()
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

  @Prop()
  languages: string[];

  @Prop()
  updatedAt: Date;

  @Prop()
  createdAt: Date;
}

export const CharactersSchema = SchemaFactory.createForClass(Character);
