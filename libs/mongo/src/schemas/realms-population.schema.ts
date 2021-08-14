import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Realm } from '@app/mongo/schemas/realms.schema';

class CharacterCovenants {
  @Prop()
  kyrian: number;

  @Prop()
  necrolord: number;

  @Prop()
  venthyr: number;

  @Prop()
  night_fae: number;
}

class CharacterClasses {
  @Prop()
  death_knight: number;

  @Prop()
  demon_hunter: number;

  @Prop()
  druid: number;

  @Prop()
  hunter: number;

  @Prop()
  mage: number;

  @Prop()
  monk: number;

  @Prop()
  paladin: number;

  @Prop()
  priest: number;

  @Prop()
  rogue: number;

  @Prop()
  shaman: number;

  @Prop()
  warlock: number;

  @Prop()
  warrior: number;
}

@Schema({ timestamps: true })
export class RealmPopulation extends Document {
  @Prop({ type: Number, ref: 'Realm' })
  realm_id: number | Realm;

  @Prop({ type: Number, ref: 'Realm' })
  connected_realm_id: number | Realm;

  /**
   * TODO name probably? day?
   */
  @Prop()
  characters_total: number;

  @Prop()
  characters_active: number;

  @Prop()
  characters_active_alliance: number;

  @Prop()
  characters_active_horde: number;

  @Prop()
  characters_active_max_level: number;

  @Prop()
  characters_guild_members: number

  @Prop()
  characters_guildless: number

  @Prop()
  players_unique: number

  @Prop()
  players_active_unique: number

  @Prop()
  guilds_total: number

  @Prop()
  guilds_alliance: number

  @Prop()
  guilds_horde: number

  @Prop({ type: CharacterClasses })
  characters_classes: CharacterClasses

  /** TODO
  @Prop({ type: CharacterProfessions })
  characters_professions: CharacterProfessions
  */

  @Prop({ type: CharacterCovenants })
  characters_covenants: CharacterCovenants
}

export const RealmsPopulationSchema = SchemaFactory.createForClass(RealmPopulation);
