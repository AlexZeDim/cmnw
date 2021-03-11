import {prop, modelOptions} from '@typegoose/typegoose';
import {toSlug} from "../refs";

@modelOptions({ schemaOptions: { timestamps: true, collection: 'realms' }, options: { customName: 'realms' } })

class CharactersPopulation {
  @prop()
  public _id!: string;
  @prop({ type: [Number] })
  public value!: number[];
}

class RealmPopulation {
  @prop({ type: () => [Number] })
  public characters_total!: number[];
  @prop({ type: () => [Number] })
  public characters_active!: number[];
  @prop({ type: () => [Number] })
  public characters_active_alliance!: number[];
  @prop({ type: () => [Number] })
  public characters_active_horde!: number[];
  @prop({ type: () => [Number] })
  public characters_active_max_level!: number[];
  @prop({ type: () => [Number] })
  public characters_guild_members!: number[];
  @prop({ type: () => [Number] })
  public characters_guildless!: number[];
  @prop({ type: () => [Number] })
  public players_unique!: number[];
  @prop({ type: () => [Number] })
  public players_active_unique!: number[];
  @prop({ type: () => [Number] })
  public guilds_total!: number[];
  @prop({ type: () => [Number] })
  public guilds_alliance!: number[];
  @prop({ type: () => [Number] })
  public guilds_horde!: number[];
  @prop({ type: () => CharactersPopulation })
  public characters_classes!: CharactersPopulation[];
  @prop({ type: () => CharactersPopulation })
  public characters_professions!: CharactersPopulation[];
  @prop({ type: () => CharactersPopulation })
  public characters_covenants!: CharactersPopulation[];
  @prop({ type: () => [Number] })
  public timestamps!: number[];
}

export class Realm {
  @prop()
  public _id!: number;
  @prop()
  public slug!: string;
  @prop()
  public name!: string;
  @prop()
  public region?: string;
  @prop()
  public name_locale?: string;
  @prop({ set: (val: string) => toSlug(val), get: (val: string) => toSlug(val) })
  public slug_locale?: string;
  @prop()
  public ticker?: string;
  @prop()
  public category?: string;
  @prop()
  public locale?: string;
  @prop()
  public timezone?: string;
  @prop()
  public status?: string;
  @prop()
  public type?: string;
  @prop()
  public population_status?: string;
  @prop({ required: true })
  public connected_realm_id!: number;
  @prop({ type:  [String] })
  public connected_realm?: [string];
  /**
   * Kihra's WarcraftLogs realm ids
   * for parsing logs via fromLogs
   */
  @prop()
  public wcl_id?: number;
  /**
   * String lastModified timestamp for auctions, gold and valuations
   * Required for valuations, getAuctionData, getGold
   */
  @prop({ default: 0 })
  public auctions!: number;
  @prop({ default: 0 })
  public valuations!: number;
  @prop({ default: 0 })
  public golds!: number;
  @prop({ type: () => RealmPopulation, _id: false })
  public population!: RealmPopulation;
}
