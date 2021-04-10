import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { Job } from 'bullmq';
import {
  queueRealms, RealmInterface, REALM_TICKER, ConnectedRealmInterface, PopulationRealmInterface,
} from '@app/core';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Realm } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import BlizzAPI, { BattleNetOptions } from 'blizzapi';
import { MAX_LEVEL } from '@app/core/constants/osint.constants';

@BullWorker({ queueName: queueRealms.name })
export class RealmsWorker {
  private readonly logger = new Logger(
    RealmsWorker.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
  ) {}

  @BullWorkerProcess()
  public async process(job: Job): Promise<Realm> {
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
      const keys: string[] = ['name', 'category', 'race', 'timezone', 'is_tournament', 'slug'];
      const keys_named: string[] = ['region', 'type'];

      await job.updateProgress(20);

      await Promise.all(Object.entries(response).map(async ([key, value]) => {
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
      }));

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
        // TODO probably place in OTHER DB
        realm.population = await this.population(realm.toObject());
        realm.markModified('population')
        await job.updateProgress(90);
      }

      await job.updateProgress(100);
      return await realm.save();
    } catch (e) {
      // TODO logger
      this.logger.error(`${RealmsWorker.name}: ${e}`)
    }
  }

  private async population (args: LeanDocument<Realm>): Promise<PopulationRealmInterface> {
    const population: PopulationRealmInterface = {
      characters_total: [],
      characters_active: [],
      characters_active_alliance: [],
      characters_active_horde: [],
      characters_active_max_level: [],
      characters_guild_members: [],
      characters_guildless: [],
      players_unique: [],
      players_active_unique: [],
      guilds_total: [],
      guilds_alliance: [],
      guilds_horde: [],
      characters_classes: [],
      characters_professions: [],
      characters_covenants: [],
      timestamps: []
    };
    try {
      const
        now: number = new Date().getTime(),
        keys: string[] = [
          'characters_total',
          'characters_active',
          'characters_active_alliance',
          'characters_active_horde',
          'characters_active_max_level',
          'characters_guild_members',
          'characters_guildless',
          'players_unique',
          'players_active_unique',
          'guilds_total',
          'guilds_alliance',
          'guilds_horde',
          'characters_classes',
          'characters_professions',
          'characters_covenants',
          'timestamps'
        ];

      /**
       * @description Import old population files
       */
      if (args.population) {
        Object.entries(args.population).map(async ([key, value]) => {
          if (keys.includes(key) && value && Array.isArray(value)) {
            population[key] = population[key].concat(args.population[key])
          }
        })
      }
      /**
       * Characters Statistics
       */
      population.characters_total.push(await CharacterModel.countDocuments({ realm: args.slug }));
      population.characters_active.push(await CharacterModel.countDocuments({ realm: args.slug, status_code: 200 }));
      population.characters_active_alliance.push(await CharacterModel.countDocuments({ realm: args.slug, status_code: 200, faction: 'Alliance' }));
      population.characters_active_horde.push(await CharacterModel.countDocuments({ realm: args.slug, status_code: 200, faction: 'Horde' }));
      population.characters_active_max_level.push(await CharacterModel.countDocuments({ realm: args.slug, status_code: 200, level: MAX_LEVEL }));
      population.characters_guild_members.push(await CharacterModel.countDocuments({ realm: args.slug, guild: { "$ne": undefined } }));
      population.characters_guildless.push(await CharacterModel.countDocuments({ realm: args.slug, guild: { $exists: false } })); //FIXME $exists: false?
      const players_unique = await CharacterModel.find({ realm: args.slug }).distinct('personality');
      population.players_unique.push(players_unique.length);
      const players_active_unique = await CharacterModel.find({ realm: args.slug, status_code: 200 }).distinct('personality');
      population.players_active_unique.push(players_active_unique.length);
      /**
       * Guild number
       * and their faction balance
       * TODO make sure that guild data always actual
       */
      population.guilds_total.push(await GuildModel.countDocuments({ realm: args.slug }));
      population.guilds_alliance.push(await GuildModel.countDocuments({ realm: args.slug, faction: 'Alliance' }));
      population.guilds_horde.push(await GuildModel.countDocuments({ realm: args.slug, faction: 'Horde' }));
      /**
       * Class popularity among
       * every active character
       */
      for (const character_class of CharactersClasses) {

        const characters_classes = population.characters_classes.find( k => k._id === character_class);
        if (characters_classes) {
          characters_classes.value.push(await CharacterModel.countDocuments({ realm: args.slug, statusCode: 200, character_class: character_class }))
        } else {
          population.characters_classes.push({
            _id: character_class,
            value: [ await CharacterModel.countDocuments({ realm: args.slug, statusCode: 200, character_class: character_class }) ]
          })
        }
      }
      /**
       * Count covenant stats
       * for every active character
       */
      for (const covenant of ['Kyrian', 'Venthyr', 'Night Fae', 'Necrolord']) {

        const characters_covenants = population.characters_classes.find( k => k._id === covenant);
        if (characters_covenants) {
          characters_covenants.value.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug, statusCode: 200, 'chosen_covenant': covenant }))
        } else {
          population.characters_covenants.push({
            _id: covenant,
            value: [ await CharacterModel.countDocuments({ 'realm.slug': args.slug, statusCode: 200, 'chosen_covenant': covenant }) ]
          })
        }
      }

      population.timestamps.push(now)

      return population;
    } catch (e) {
      this.logger.error(`population: ${e}`)
      return population
    }
  }
}
