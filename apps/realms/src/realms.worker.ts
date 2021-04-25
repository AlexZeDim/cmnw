import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { Job } from 'bullmq';
import {
  realmsQueue,
  RealmInterface,
  REALM_TICKER,
  ConnectedRealmInterface,
  PopulationRealmInterface,
  MAX_LEVEL, CHARACTER_CLASS, FACTION, COVENANTS, toKey,
} from '@app/core';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Realm, RealmPopulation } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import BlizzAPI, { BattleNetOptions } from 'blizzapi';

@BullWorker({ queueName: realmsQueue.name })
export class RealmsWorker {
  private readonly logger = new Logger(
    RealmsWorker.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(RealmPopulation.name)
    private readonly RealmPopulationModel: Model<RealmPopulation>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
  ) {}

  @BullWorkerProcess(realmsQueue.workerOptions)
  public async process(job: Job): Promise<void> {
    try {
      const args: RealmInterface & BattleNetOptions = { ...job.data };
      const summary: RealmInterface = { _id: args._id, slug: args.slug };

      await job.updateProgress(1);

      let realm = await this.RealmModel.findById(args._id);

      await job.updateProgress(5);

      if (!realm) {
        realm = new this.RealmModel({
          _id: args._id,
        });
      }

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });

      await job.updateProgress(10);

      const response: Record<string, any> = await this.BNet.query(`/data/wow/realm/${args.slug}`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'dynamic-eu' },
      });
      // TODO review the region, for bnet
      const keys: string[] = ['name', 'category', 'race', 'timezone', 'is_tournament', 'slug'];
      const keys_named: string[] = ['region', 'type'];

      await job.updateProgress(20);

      await Promise.all(
        Object.entries(response).map(async ([key, value]) => {
          if (keys.includes(key) && value) summary[key] = value;
          if (key === 'id' && value) {
            summary._id = value;
            await job.updateProgress(25);
          }
          if (key === 'name' && value) {
            if (typeof value === 'string' && REALM_TICKER.has(value)) summary.ticker = REALM_TICKER.get(value);
            if (typeof value === 'object' && 'name' in value && REALM_TICKER.has(value.name)) summary.ticker = REALM_TICKER.get(value.name);
            await job.updateProgress(30);
          }
          if (keys_named.includes(key) && typeof value === 'object' && value !== null && 'name' in value) {
            if (value.name) summary[key] = value.name;
          }
          if (key === 'locale' && value) {
            summary.locale = value.match(/../g).join('_');
            if (value !== 'enGB') {
              const realm_locale: Record<string, any> = await this.BNet.query(`/data/wow/realm/${args.slug}`, {
                timeout: 10000,
                params: { locale: summary.locale },
                headers: { 'Battlenet-Namespace': 'dynamic-eu' },
              });
              await job.updateProgress(40);
              if (realm_locale && realm_locale.name) {
                summary.name_locale = realm_locale.name;
                summary.slug_locale = realm_locale.name;
              }
            } else if ('name' in response) {
              summary.name_locale = response.name;
              summary.slug_locale = response.name;
            }
          }
          if (key === 'connected_realm' && value && value.href) {
            const connected_realm_id: number = parseInt(value.href.replace(/\D/g, ''));
            if (connected_realm_id && !isNaN(connected_realm_id)) {
              const connected_realm: ConnectedRealmInterface = await this.BNet.query(`/data/wow/connected-realm/${connected_realm_id}`, {
                timeout: 10000,
                params: { locale: 'en_GB' },
                headers: { 'Battlenet-Namespace': 'dynamic-eu' },
              });
              await job.updateProgress(50);
              if (connected_realm) {
                if (connected_realm.id) summary.connected_realm_id = parseInt(connected_realm.id);
                if (connected_realm.has_queue) summary.has_queue = connected_realm.has_queue;
                if (connected_realm.status && connected_realm.status.name) summary.status = connected_realm.status.name;
                if (connected_realm.population && connected_realm.population.name) summary.population_status = connected_realm.population.name;
                if (connected_realm.realms && Array.isArray(connected_realm.realms) && connected_realm.realms.length) {
                  summary.connected_realms = connected_realm.realms.map(({ slug }) => slug);
                }
              }
            }
          }
        })
      );

      Object.assign(realm, summary);
      await job.updateProgress(80);

      if (args.wcl_ids && args.wcl_ids.length) {
        args.wcl_ids.map(({ name, id }) => {
          if (name === realm.name) {
            realm.wcl_id = id;
            return
          } else if (name === realm.name_locale) {
            realm.wcl_id = id;
            return
          }
        })
      }

      if (!realm.isNew && args.population) {
        await this.population(realm.toObject());
        await job.updateProgress(90);
      }

      await realm.save();
      await job.updateProgress(100);
    } catch (e) {
      this.logger.error(`${RealmsWorker.name}: ${e}`)
    }
  }

  private async population(args: LeanDocument<Realm>): Promise<void> {
    try {
      const realm = await this.RealmModel.findById(args._id);
      if (!realm) {
        this.logger.error(`population: ${args._id} not found!`)
        return;
      }

      const population: Partial<PopulationRealmInterface> = {
        characters_classes: {
          death_knight: 0,
          demon_hunter: 0,
          druid: 0,
          hunter: 0,
          mage: 0,
          monk: 0,
          paladin: 0,
          priest: 0,
          rogue: 0,
          shaman: 0,
          warlock: 0,
          warrior: 0
        },
        characters_covenants: {
          kyrian: 0,
          venthyr: 0,
          night_fae: 0,
          necrolord: 0
        }
      };

      /**
       * Characters Statistics
       */
      population.characters_total = await this.CharacterModel.countDocuments({ realm: args.slug });
      population.characters_active = await this.CharacterModel.countDocuments({ realm: args.slug, status_code: 200 });
      population.characters_active_alliance = await this.CharacterModel.countDocuments({ realm: args.slug, status_code: 200, faction: FACTION.A });
      population.characters_active_horde = await this.CharacterModel.countDocuments({ realm: args.slug, status_code: 200, faction: FACTION.H });
      population.characters_active_max_level = await this.CharacterModel.countDocuments({ realm: args.slug, status_code: 200, level: MAX_LEVEL });
      population.characters_guild_members = await this.CharacterModel.countDocuments({ realm: args.slug, guild: { "$ne": undefined } });
      population.characters_guildless = await this.CharacterModel.countDocuments({ realm: args.slug, guild: undefined })
      const players_unique = await this.CharacterModel.find({ realm: args.slug }).distinct('personality');
      population.players_unique = players_unique.length;
      const players_active_unique = await this.CharacterModel.find({ realm: args.slug, status_code: 200 }).distinct('personality');
      population.players_active_unique = players_active_unique.length;
      /**
       * Guild number
       * and their faction balance
       * TODO make sure that guild data always actual
       */
      population.guilds_total = await this.GuildModel.countDocuments({ realm: args.slug });
      population.guilds_alliance = await this.GuildModel.countDocuments({ realm: args.slug, faction: FACTION.A });
      population.guilds_horde = await this.GuildModel.countDocuments({ realm: args.slug, faction: FACTION.H });
      /**
       * Class popularity among
       * every active character
       */
      for (const character_class of CHARACTER_CLASS) {
        const key: string = toKey(character_class);
        population.characters_classes[key] = await this.CharacterModel.countDocuments({ realm: args.slug, statusCode: 200, character_class: character_class });
      }
      /**
       * Count covenant stats
       * for every active character
       */
      for (const covenant of COVENANTS) {
        const key: string = toKey(covenant);
        population.characters_covenants[key] = await this.CharacterModel.countDocuments({ 'realm.slug': args.slug, statusCode: 200, 'chosen_covenant': covenant });
      }

      await this.RealmPopulationModel.create(population);
    } catch (e) {
      this.logger.error(`population: ${args._id}:${e}`)
    }
  }
}
