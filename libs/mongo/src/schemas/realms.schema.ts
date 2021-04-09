import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RealmDocument = Realm & Document;

class CharactersPopulation {
  @Prop()
  _id: string;

  @Prop()
  value: number[];
}

class RealmPopulation {
  @Prop()
  characters_total: number[]

  @Prop()
  characters_active: number[]

  @Prop()
  characters_active_alliance: number[]

  @Prop()
  characters_active_horde: number[]

  @Prop()
  characters_guild_members: number[]

  @Prop()
  characters_guildless: number[]

  @Prop()
  players_unique: number[]

  @Prop()
  players_active_unique: number[]

  @Prop()
  guilds_total: number[]

  @Prop()
  guilds_alliance: number[]

  @Prop()
  guilds_horde: number[]

  @Prop({ ref: CharactersPopulation })
  characters_classes: CharactersPopulation[]

  @Prop({ ref: CharactersPopulation })
  characters_professions: CharactersPopulation[]

  @Prop({ ref: CharactersPopulation })
  characters_covenants: CharactersPopulation[]

  @Prop()
  timestamps: number[]
}

@Schema()
export class Realm {
  @Prop()
  _id: number;

  @Prop()
  slug: string;

  @Prop()
  name: string;

  @Prop()
  region: string;

  @Prop()
  name_locale: string;

  @Prop()
  slug_locale: string;

  @Prop()
  ticker: string;

  @Prop()
  category: string;

  @Prop()
  locale: string;

  @Prop()
  timezone: string;

  @Prop()
  type: string;

  @Prop()
  population_status: string;

  @Prop()
  connected_realm_id: [string];

  @Prop()
  connected_realm: [string];
  /**
   * Kihra's WarcraftLogs realm ids
   * for parsing logs via fromLogs
   */
  @Prop()
  wcl_id: string;
  /**
   * String lastModified timestamp for auctions, gold and valuations
   * Required for valuations, getAuctionData, getGold
   */
  @Prop({ default: 0 })
  auctions: number;

  @Prop({ default: 0 })
  valuations: number;

  @Prop({ default: 0 })
  golds: number;

  @Prop({ ref: RealmPopulation, _id: false })
  population: RealmPopulation;
}

export const RealmSchema = SchemaFactory.createForClass(Realm);
RealmSchema.index(
  {
    slug: 'text',
    name: 'text',
    name_locale: 'text',
    slug_locale: 'text',
    ticker: 'text',
    region: 'text',
    locale: 'text'
  },
  {
    weights:
      {
        'slug': 10,
        'name': 1,
        'slug_locale': 1,
        'name_locale': 1,
        'ticker': 3,
        'region': 1,
        'locale': 1
      },
    name: 'SQ'
  }
)
RealmSchema.index({ connected_realm_id: 1 }, { name: 'CR' })
