import {ObjectProps, CharacterProps, RealmProps, ConnectedRealmProps, PopulationRealmProps, RealmsTicker, CharactersClasses, CharactersProfessions} from "../interface/constant";
import {CharacterModel} from '../db/mongo/characters.model'
import {GuildModel} from '../db/mongo/guilds.model'
import {range} from 'lodash';
import Xray from 'x-ray';
import BlizzAPI from 'blizzapi'

const getCharacter = async <T extends CharacterProps>(p: T): Promise<string|void> => {
  try {
    const { _id } = p;
    //_id;  string
    //rest; const rest: Pick<T, Exclude<keyof T, "a" | "b">>
    await new Promise(r => setTimeout(r, 5000));
    return _id
  } catch (e) {
    console.error(e)
  }
}

/**
 * Index every realm for WCL id, US:0,246 EU:247,517 (RU: 492) Korea: 517
 * @param start {number}
 * @param end {number}
 * @returns {Promise<Map<any, any>>}
 */
const getWarcraftLogsID = async (start: number = 0, end: number = 517): Promise<Map<any, any>>  => {
  const wcl_map = new Map();
  const x = Xray();
  try {
    const wcl_ids: number[] = range(start, end, 1);
    for (const wcl_id of wcl_ids) {
      const realm_name: any  = await x(`https://www.warcraftlogs.com/server/id/${wcl_id}`, '.server-name').then(res => res)
      if (realm_name) wcl_map.set(realm_name, wcl_id)
    }
    return wcl_map
  } catch (error) {
    console.error(`E,${getWarcraftLogsID.name}:${error}`)
    return wcl_map
  }
}

/**
 * TODO refactor, probably token should be optional argument, not BlizzAPI and Mongo
 * TODO pass the wcl_id
 * @param realm_slug
 * @param BlizzAPI
 */
const getRealm = async (realm_slug: string, BlizzAPI: BlizzAPI): Promise<{}> => {
  const summary: RealmProps = {};
  try {
    const response: ObjectProps = await BlizzAPI.query(`/data/wow/realm/${realm_slug}`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'dynamic-eu' }
    });
    const keys: string[] = ['name', 'category', 'race', 'timezone', 'is_tournament', 'slug'];
    const keys_named: string[] = ['region', 'type'];
    await Promise.all(Object.entries(response).map(async ([key, value]) => {
      if (keys.includes(key) && value) summary[key] = value
      if (key === 'name' && value &&  'name' in value) {
        if (RealmsTicker.has(value)) summary.ticker = RealmsTicker.get(value.name);
      }
      if (keys_named.includes(key) && typeof value === 'object' && value !== null && 'name' in value) {
        if (value.name) summary[key] = value.name
      }
      if (key === 'locale' && value) {
        summary.locale = value.match(/../g).join('_');
        if (value !== 'enGB') {
          const realm_locale = await BlizzAPI.query(`/data/wow/realm/${realm_slug}`, {
            timeout: 10000,
            params: { locale: summary.locale },
            headers: { 'Battlenet-Namespace': 'dynamic-eu' }
          })
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
          const connected_realm: ConnectedRealmProps = await BlizzAPI.query(`/data/wow/connected-realm/${connected_realm_id}`, {
            timeout: 10000,
            params: { locale: 'en_GB' },
            headers: { 'Battlenet-Namespace': 'dynamic-eu' }
          });
          if (connected_realm) {
            if (connected_realm.id) summary.connected_realm_id = parseInt(connected_realm.id);
            if (connected_realm.has_queue) summary.has_queue = connected_realm.has_queue;
            if (connected_realm.status && connected_realm.status.name) summary.status = connected_realm.status.name;
            if (connected_realm.population && connected_realm.population.name) summary.population_status = connected_realm.population.name;
            if (connected_realm.realms && Array.isArray(connected_realm.realms) && connected_realm.realms.length) {
              summary.connected_realm = connected_realm.realms.map(({ slug }) => slug);
            }
          }
        }
      }
    }))
    return summary;
  } catch (e) {
    return summary;
  }
}

const countPopulation = async (realm_slug: string): Promise<PopulationRealmProps> => {
  const population: PopulationRealmProps = {
    characters_classes: [],
    characters_professions: [],
    characters_covenants: []
  };
  try {
    const max_level = 60;

    /**
     * Characters Statistics
     */
    population.characters_total = await CharacterModel.countDocuments({ 'realm.slug': realm_slug });
    population.characters_active = await CharacterModel.countDocuments({ 'realm.slug': realm_slug, statusCode: 200 });
    population.characters_active_alliance = await CharacterModel.countDocuments({ 'realm.slug': realm_slug, statusCode: 200, faction: 'Alliance' });
    population.characters_active_horde = await CharacterModel.countDocuments({ 'realm.slug': realm_slug, statusCode: 200, faction: 'Horde' });
    population.characters_active_max_level = await CharacterModel.countDocuments({ 'realm.slug': realm_slug, statusCode: 200, level: max_level });
    population.characters_guild_members = await CharacterModel.countDocuments({ 'realm.slug': realm_slug, guild: { $ne: null } });
    population.characters_guildless = await CharacterModel.countDocuments({ 'realm.slug': realm_slug, guild: { $exists: false } });
    const players_unique = await CharacterModel.find({ 'realm.slug': realm_slug }).distinct('personality')
    population.players_unique = players_unique.length
    const players_active_unique = await CharacterModel.find({ 'realm.slug': realm_slug, statusCode: 200 }).distinct('personality')
    population.players_active_unique = players_active_unique.length

    /**
     * Class popularity among
     * every active character
     */
    for (const character_class of CharactersClasses) {
      population.characters_classes.push({
        _id: character_class,
        value: await CharacterModel.countDocuments({
          'realm.slug': realm_slug,
          statusCode: 200,
          character_class: character_class
        })
      })
    }

    /**
     * Measure crafting professions
     * for every active character
     */
    for (const { name, id } of CharactersProfessions) {
      population.characters_professions.push({
        _id: name,
        value: await CharacterModel.countDocuments({
          'realm.slug': realm_slug,
          statusCode: 200,
          'professions.id': id
        })
      })
    }

    /**
     * Count covenant stats
     * for every active character
     */
    for (const covenant of ['Kyrian', 'Venthyr', 'Night Fae', 'Necrolord']) {
      population.characters_covenants.push({
        _id: covenant,
        value: await CharacterModel.countDocuments({ 'realm.slug': realm_slug, statusCode: 200, 'chosen_covenant': covenant })
      })
    }

    /**
     * Guild number
     * and their faction balance
     */
    population.guilds_total = await GuildModel.countDocuments({'realm.slug': realm_slug})
    population.guilds_alliance = await GuildModel.countDocuments({'realm.slug': realm_slug, faction: 'Alliance'})
    population.guilds_horde = await GuildModel.countDocuments({'realm.slug': realm_slug, faction: 'Horde'})

    return population;
  } catch (error) {
    console.error(`E,${countPopulation.name}:${error}`)
    return population;
  }
}

export { getCharacter, getWarcraftLogsID, getRealm, countPopulation }
