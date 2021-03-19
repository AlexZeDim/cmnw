import {
  CharacterProps,
  CharactersClasses,
  CharactersProfessions,
  ConnectedRealmProps,
  GuildMemberProps,
  GuildProps,
  ObjectProps,
  PopulationRealmProps,
  RealmProps,
  RealmsTicker
} from "../interface/constant";
import {
  CharacterModel,
  RealmModel,
  KeysModel,
  LogModel,
  AccountModel,
  GuildModel
} from "../db/mongo/mongo.model";
import {AliasKey} from "../interface/constant";
import {capitalize, toSlug} from "../db/mongo/refs";
import {range} from 'lodash';
import BlizzAPI, {BattleNetOptions} from 'blizzapi';
import {crc32} from '@node-rs/crc32';
import puppeteer from 'puppeteer';
import axios from 'axios';
import Xray from 'x-ray';
import {queueCharacters} from "./osint.queue";
import {Tabletojson} from "tabletojson/dist";


/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns media information about character
 */
const updateCharacterMedia = async (name_slug: string, realm_slug: string, BlizzAPI: BlizzAPI): Promise<ObjectProps> => {
  const media: ObjectProps = {};
  try {
    const response: any = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}/character-media`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || !response.assets) return media

    if (response.character && response.character.id) media.id = response.character.id

    const assets: {key: string, value: string}[] = response.assets;
    await Promise.all(assets.map(({key, value}) => {
      media[key] = value
    }))
    return media
  } catch (e) {
    console.error(`E,${updateCharacterMedia.name},${name_slug}@${realm_slug}:${e}`)
    return media
  }
}

/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns mount collection for the selected character
 */
const updateCharacterMounts = async (name_slug: string, realm_slug: string, BlizzAPI: BlizzAPI): Promise<ObjectProps> => {
  const mounts_collection: ObjectProps = {};
  try {
    const response: any = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/mounts`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || !response.mounts || !response.mounts.length) return mounts_collection
    const { mounts } = response;
    mounts_collection.mounts = []
    await Promise.all(mounts.map((m: { mount: { id: number; name: string; }; }) => {
      if ('mount' in m) {
        mounts_collection.mounts.push({
          _id: m.mount.id,
          name: m.mount.name
        })
      }
    }))
    return mounts_collection
  } catch (error) {
    console.error(`E,${updateCharacterMounts.name},${name_slug}@${realm_slug}:${error}`)
    return mounts_collection
  }
}

/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns pets collection and hash values for the selected character
 */
const updateCharacterPets = async (name_slug: string, realm_slug: string, BlizzAPI: BlizzAPI): Promise<ObjectProps> => {
  const pets_collection: ObjectProps = {};
  try {
    const
      hash_b: string[] = [],
      hash_a: string[] = [],
      response: any = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/pets`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      });
    if (!response || !response.pets || !response.pets.length) return pets_collection
    const { pets } = response;
    pets_collection.pets = [];
    await Promise.all(pets.map((pet: { id: number; species: { name: string; }; name: string; is_active: boolean; level: { toString: () => string; }; }) => {
      pets_collection.pets.push({
        _id: pet.id,
        name: pet.species.name,
      })
      if ('is_active' in pet) {
        if ('name' in pet) hash_a.push(pet.name);
        hash_a.push(pet.species.name, pet.level.toString());
      }
      if ('name' in pet) hash_b.push(pet.name);
      hash_b.push(pet.species.name, pet.level.toString());
    }))
    if (hash_b.length) pets_collection.hash_a = crc32(hash_b.toString()).toString(16);
    if (hash_a.length) pets_collection.hash_b = crc32(hash_a.toString()).toString(16);
    return pets_collection
  } catch (error) {
    console.error(`E,${updateCharacterPets.name},${name_slug}@${realm_slug}:${error}`)
    return pets_collection
  }
}

/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns profession array for the requested character
 */
const updateCharacterProfessions = async (name_slug: string, realm_slug: string, BlizzAPI: BlizzAPI): Promise<ObjectProps> => {
  const professions: ObjectProps = {};
  try {
    const response: any = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}/professions`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response) return professions
    professions.professions = [];
    if ('primaries' in response) {
      const { primaries } = response
      if (Array.isArray(primaries) && primaries.length) {
        await Promise.all(primaries.map(async primary => {
          if (primary.profession && primary.profession.name && primary.profession.id) {
            const skill_tier: ObjectProps = {
              name: primary.profession.name,
              id: primary.profession.id,
              tier: 'Primary',
            }
            if (primary.specialization && primary.specialization.name) skill_tier.specialization = primary.specialization.name
            professions.professions.push(skill_tier)
          }
          if ('tiers' in primary && Array.isArray(primary.tiers) && primary.tiers.length) {
            await Promise.all(primary.tiers.map(async (tier: { tier: { id: number; name: string; }; skill_points: number; max_skill_points: number; }) => {
              if ('tier' in tier) {
                professions.professions.push({
                  id: tier.tier.id,
                  name: tier.tier.name,
                  skill_points: tier.skill_points,
                  max_skill_points: tier.max_skill_points,
                  tier: 'Primary Tier'
                })
              }
            }))
          }
        }))
      }
    }

    if ('secondaries' in response) {
      const { secondaries } = response
      if (Array.isArray(secondaries) && secondaries.length) {
        await Promise.all(secondaries.map(async secondary => {
          if (secondary.profession && secondary.profession.name && secondary.profession.id) {
            professions.professions.push({
              name: secondary.profession.name,
              id: secondary.profession.id,
              tier: 'Secondary'
            })
          }
          if ('tiers' in secondary && Array.isArray(secondary.tiers) && secondary.tiers.length) {
            await Promise.all(secondary.tiers.map((tier: { tier: { id: number; name: string; }; skill_points: number; max_skill_points: number; }) => {
              if ('tier' in tier) {
                professions.professions.push({
                  id: tier.tier.id,
                  name: tier.tier.name,
                  skill_points: tier.skill_points,
                  max_skill_points: tier.max_skill_points,
                  tier: 'Secondary Tier'
                })
              }
            }))
          }
        }))
      }
    }
    return professions
  } catch (error) {
    console.error(`E,${updateCharacterProfessions.name},${name_slug}@${realm_slug}:${error}`)
    return professions
  }
}

/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns summary status, like guild, realms and so on
 */
const updateCharacterSummary = async (name_slug: string, realm_slug: string, BlizzAPI: BlizzAPI): Promise<ObjectProps> => {
  const summary: ObjectProps = {}
  try {
    const response: object = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || typeof response !== 'object') return summary
    const keys_named = ['gender', 'faction', 'race', 'character_class', 'active_spec'];
    const keys = ['level', 'achievement_points'];
    await Promise.all(Object.entries(response).map(([key, value]) => {
      if (keys_named.includes(key) && value !== null && value.name) summary[key] = value.name
      if (keys.includes(key) && value !== null) summary[key] = value
      if (key === 'last_login_timestamp') summary.last_modified = value
      if (key === 'average_item_level') summary.average_item_level = value
      if (key === 'equipped_item_level') summary.equipped_item_level = value
      if (key === 'covenant_progress' && typeof value === 'object' && value !== null) {
        if (value.chosen_covenant && value.chosen_covenant.name) summary.chosen_covenant = value.chosen_covenant.name;
        if (value.renown_level) summary.renown_level = value.renown_level;
      }
      if (key === 'guild' && typeof value === 'object' && value !== null) {
        if (value.id && value.name) {
          summary.guild_id = toSlug(`${value.name}@${realm_slug}`);
          summary.guild = value.name;
          summary.guild_guid = value.id;
        }
      }
      if (key === 'realm' && typeof value === 'object' && value !== null) {
        if (value.id && value.name && value.slug) {
          summary.realm_id = value.id;
          summary.realm_name = value.name;
          summary.realm = value.slug;
        }
      }
      if (key === 'active_title' && typeof value === 'object' && value !== null) {
        if ('active_title' in value) {
          const { active_title } = value
          if (active_title.id) summary.hash_t = parseInt(active_title.id, 16)
        }
      }
    }))
    if (!summary.guild) {
      summary.guild_id = undefined;
      summary.guild = undefined;
      summary.guild_guid = undefined;
      summary.guild_rank = undefined;
    }
    summary.status_code = 200;
    return summary
  } catch (error) {
    console.error(`E,${updateCharacterSummary.name},${name_slug}@${realm_slug}:${error}`)
    return summary
  }
}

/**
 *
 * @param _id {string} character _id for updating DB document
 * @param hash_a {string} hash_a value for searching similarities
 * @returns {Promise<{}>} returns hash_f value and personality ID
 */
const updateCharacterAccount = async (_id: string, hash_a: string): Promise<ObjectProps> => {
  const account: ObjectProps = {}
  try {
    if ( _id || !hash_a) return account
    const personalities = await CharacterModel.find({ hash_a: hash_a }).lean().distinct('personality');
    if (!personalities.length) {
      const persona = new AccountModel({
        alias: [
          {
            key: AliasKey.Character,
            value: _id
          }
        ]
      })
      account.hash_f = persona._id.toString().substr(-6)
      account.personality = persona._id;
    } else if (personalities.length === 1) {
      account.hash_f = personalities[0].toString().substr(-6)
      account.personality = personalities[0]
      await AccountModel.findByIdAndUpdate(account.personality, { '$addToSet': { 'aliases': { key: 'character', value: _id } } })
    } else {
      console.warn(`P,${updateCharacterAccount.name},${_id},updatePersonality:${personalities.length}`)
    }
    return account
  } catch (error) {
    console.error(`E,${updateCharacterAccount.name},${_id}:${error}`)
    return account
  }
}

/**
 * This is quite heavy CPU and RAM function, do not run concurrent!
 * @param name {string} first-uppercase character's name
 * @param realm_slug {string} realm slug for current character
 * @returns {Promise<{}>} return Mythic Logs Performance from Kihra's WarcraftLogs
 */
const updateCharacterWarcraftLogs = async (name: string, realm_slug: string): Promise<ObjectProps> => {
  const warcraft_logs: ObjectProps = {};
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`https://www.warcraftlogs.com/character/eu/${realm_slug}/${name}#difficulty=5`);
    const [getXpath] = await page.$x('//div[@class=\'best-perf-avg\']/b');
    if (getXpath) {
      const bestPrefAvg = await page.evaluate(name => name['innerText'], getXpath);
      if (bestPrefAvg && bestPrefAvg !== '-') {
        warcraft_logs.wcl_percentile = parseFloat(bestPrefAvg)
      }
    }
    await browser.close();
    return warcraft_logs;
  } catch (error) {
    console.error(`E,${updateCharacterWarcraftLogs.name},${name}@${realm_slug}:${error}`)
    return warcraft_logs
  }
}

/**
 *
 * @param name {string} first-uppercase character's name
 * @param realm_slug {string} realm slug for current character
 * @returns {Promise<{}>}
 */
const updateWowProgress = async (name: string, realm_slug: string): Promise<ObjectProps> => {
  const wow_progress: ObjectProps = {};
  const x = Xray();
  try {
    const wowprogress: any = await x(encodeURI(`https://www.wowprogress.com/character/eu/${realm_slug}/${name}`), '.registeredTo', ['.language']);
    if (!Array.isArray(wowprogress) || !wowprogress || !wowprogress.length) return wow_progress
    await Promise.all(wowprogress.map(line => {
      const [key, value] = line.split(':')
      if (key === 'Battletag') wow_progress.battle_tag = value.trim();
      if (key === 'Looking for guild') wow_progress.transfer = value.includes('ready to transfer');
      if (key === 'Raids per week') {
        if (value.includes(' - ')) {
          const [from, to] = value.split(' - ');
          wow_progress.days_from = parseInt(from);
          wow_progress.days_to = parseInt(to)
        }
      }
      if (key === 'Specs playing') wow_progress.role = value.trim()
      if (key === 'Languages') wow_progress.languages = value.split(',').map((s: string) => s.toLowerCase().trim())
    }))
    return wow_progress
  } catch (error) {
    console.error(`E,${updateWowProgress.name},${name}@${realm_slug}:${error}`)
    return wow_progress
  }
}

/**
 *
 * @param name {string} first-uppercase character's name
 * @param realm_slug {string} realm slug for current character
 * @returns {Promise<{}>}
 */
const updateCharacterRaiderIO = async (name: string, realm_slug: string): Promise<ObjectProps> => {
  const raider_io: ObjectProps = {};
  try {
    const response: any = await axios.get(encodeURI(`https://raider.io/api/v1/characters/profile?region=eu&realm=${realm_slug}&name=${name}&fields=mythic_plus_scores_by_season:current,raid_progression`));
    if (!response || !response.data) return raider_io
    if ('raid_progression' in response.data) {
      const raid_progress: ObjectProps = response.data['raid_progression'];
      const pve_progress: ObjectProps = {};
      for (const [key, value] of Object.entries(raid_progress)) {
        pve_progress[key] = value['summary']
      }
      raider_io.progress = pve_progress;
    }
    if ('mythic_plus_scores_by_season' in response.data) {
      const rio_score = response.data['mythic_plus_scores_by_season']
      if (rio_score && Array.isArray(rio_score) && rio_score.length) {
        for (const rio of rio_score) {
          if ('scores' in rio) {
            raider_io.rio = rio.scores.all
          }
        }
      }
    }
    return raider_io
  } catch (error) {
    console.error(`E,${updateCharacterRaiderIO.name},${name}@${realm_slug}:${error}`)
    return raider_io
  }
}

const characterDetectDiff = async (character_o: CharacterProps, character_u: CharacterProps): Promise<void> => {
  try {
    const
      detectiveFields: string[] = ['name', 'realm', 'race', 'gender', 'faction'],
      t0: Date = character_o.last_modified || character_o.updatedAt || new Date(),
      t1: Date = character_u.last_modified || character_u.updatedAt || new Date();

    await Promise.all([detectiveFields.map(async check => {
      if (check in character_o && check in character_u && character_o[check] !== character_u[check]) {
        if (check === 'name' || check === 'realm') {
          await LogModel.updateMany(
            {
              root_id: character_o._id,
            },
            {
              root_id: character_u._id,
              $push: { root_history: character_u._id },
            },
          );
        }
        await LogModel.create({
          root_id: character_u._id,
          root_history: [character_u._id],
          action: check,
          event: 'character',
          original: character_o[check],
          updated: character_u[check],
          t0: t0,
          t1: t1,
        })
      }
    })])
  } catch (e) {
    console.error(`E,${characterDetectDiff.name}:${e}`)
  }
}

/**
 * Request character
 * @param args
 */

const getCharacter = async <T extends CharacterProps & BattleNetOptions>(args: T): Promise<Partial<CharacterProps> | void> => {
  try {
    const realm = await RealmModel
      .findOne(
        { $text: { $search: args.realm } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
    if (!realm) return

    const
      name_slug: string = toSlug(args.name),
      character_original: CharacterProps = {
        _id: `${name_slug}@${realm.slug}`,
        name: capitalize(args.name),
        status_code: 100,
        realm: realm.slug,
        realm_id: realm._id,
        realm_name: realm.name
      },
      character_requested: CharacterProps = {
        _id: `${name_slug}@${realm.slug}`,
        name: capitalize(args.name),
        status_code: 100,
        realm: realm.slug,
        realm_id: realm._id,
        realm_name: realm.name
      };

    let character = await CharacterModel.findById(character_original._id);

    if (character) {
      /**
       * If guild rank true and character is exists
       * and lastModified from guild > character lastModified
       * TODO refactor guildRank part, to requested probably
       */
      if (args.guildRank) {
        if (args.guild) {
          if (character.guild === args.guild) {
            character.guild_rank = args.guild_rank
          }
          if (!character.guild && character.last_modified && args.last_modified) {
            if (args.last_modified.getTime() > character.last_modified.getTime()) {
              character.guild = args.guild
            }
          }
          console.info(`G:${(args.iterations) ? (args.iteration + ':') : ('')}${character._id},guildRank:${args.guildRank}`)
          await character.save()
        }
      }

      /**
       * If character exists and createOnlyUnique initiated,
       * or updated recently return
       */
      if (args.createOnlyUnique) {
        console.warn(`E:${(args.teration) ? (args.iteration + ':') : ('')}${character._id},createOnlyUnique:${args.createOnlyUnique}`);
        return character
      }

      if (!args.forceUpdate && new Date().getTime() - (48 * 60 * 60 * 1000) < character.updatedAt.getTime()) {
        console.warn(`E:${(args.iterations) ? (args.iterations + ':') : ('')}${character._id},forceUpdate:${args.forceUpdate}`);
        return character
      }

      /**
       * We create copy of character to compare it
       * with previous timestamp
       */
      Object.assign(character_original, character.toObject())
      character.status_code = 100
    } else {
      character = new CharacterModel({
        _id: `${name_slug}@${realm.slug}`,
        name: capitalize(args.name),
        status_code: 100,
        realm: realm.slug,
        realm_id: realm._id,
        realm_name: realm.name,
        created_by: 'OSINT-getCharacter',
        updated_by: 'OSINT-getCharacter',
      })
      /**
       * Upload other fields from imported values
       * TODO and make sure that _id not inherit
       */
    }
    /**
     * Inherit created_by & updated_by
     * in any case from args, if exists
     */
    if (args.created_by) character.created_by = args.created_by;
    if (args.updated_by) character.created_by = args.updated_by;

    /**
     * BlizzAPI
     */
    const api = new BlizzAPI({
      region: args.region,
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      accessToken: args.accessToken
    });

    const character_status: ObjectProps = await api.query(`/profile/wow/character/${character.realm}/${name_slug}/status`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    }).catch(status_error => {
      if (status_error.response) {
        if (status_error.response.data && status_error.response.data.code) {
          //TODO optional returnOnError?
          character_requested.status_code = status_error.response.data.code
        }
      }
    })

    /**
     * Define character id for sure
     */
    if (character_status && character_status.id) {
      character.id = character_status.id
      if (character_status.lastModified) character.last_modified = character_status.lastModified
    }

    if (character_status && character_status.is_valid && character_status.is_valid === true) {
      const [summary, pets_collection, mount_collection, professions, media] = await Promise.all([
        updateCharacterSummary(name_slug, character.realm, api),
        updateCharacterPets(name_slug, character.realm, api),
        updateCharacterMounts(name_slug, character.realm, api),
        updateCharacterProfessions(name_slug, character.realm, api),
        updateCharacterMedia(name_slug, character.realm, api)
      ]);

      Object.assign(character_requested, summary);
      Object.assign(character_requested, pets_collection);
      Object.assign(character_requested, mount_collection);
      Object.assign(character_requested, professions);
      Object.assign(character_requested, media);
    }

    /**
     * TODO detective after transfer / rename
     * Check differences between req & original
     * only if original
     */
    if (!character.isNew) {
      await characterDetectDiff(character_original, character_requested)
    }

    //TODO character inherit requested

    await character.save({ w: 1, j: true, wtimeout: 10000 });
    return character;
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
const getRealmsWarcraftLogsID = async (start: number = 0, end: number = 517): Promise<Map<any, any>>  => {
  const wcl_map: Map<any, any> = new Map();
  const x = Xray();
  try {
    const wcl_ids: number[] = range(start, end, 1);
    for (const wcl_id of wcl_ids) {
      const realm_name: any = await x(`https://www.warcraftlogs.com/server/id/${wcl_id}`, '.server-name').then(res => res)
      if (realm_name) wcl_map.set(realm_name, wcl_id)
    }
    return wcl_map
  } catch (error) {
    console.error(`E,${getRealmsWarcraftLogsID.name}:${error}`)
    return wcl_map
  }
}

const updateGuildSummary = async (guild_slug: string, realm_slug: string, BlizzAPI: BlizzAPI ): Promise<ObjectProps> => {
  try {
    return { a: 1 }
  } catch (e) {
    console.error(e)
    return { a: 1 }
  }
}

/**
 * TODO refactor
 * get Guild
 */
const getGuild = async <T extends GuildProps & BattleNetOptions> (args: T): Promise <Partial<GuildProps> | void> => {
  try {
    const realm = await RealmModel
      .findOne(
        { $text: { $search: args.realm } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
    if (!realm) return

    const
      name_slug: string = toSlug(args.name),
      guild_original: GuildProps = {
        _id: `${name_slug}@${realm.slug}`,
        name: capitalize(args.name),
        status_code: 100,
        realm: realm.slug,
        realm_id: realm._id,
        realm_name: realm.name,
        members: []
      },
      guild_requested: GuildProps = {
        _id: `${name_slug}@${realm.slug}`,
        name: capitalize(args.name),
        status_code: 100,
        realm: realm.slug,
        realm_id: realm._id,
        realm_name: realm.name,
        members: []
      };

    /**
     * BlizzAPI
     */
    const api = new BlizzAPI({
      region: args.region,
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      accessToken: args.accessToken
    });

    let guild = await GuildModel.findById(guild_requested._id);
    if (guild) {
      if (args.createOnlyUnique) {
        console.warn(`E:${(args.iteration) ? (args.iteration + ':') : ('')}${guild._id}:createOnlyUnique:${args.createOnlyUnique}`);
        return guild
      }
      if (!args.forceUpdate && ((new Date().getTime() - (12 * 60 * 60 * 1000)) < guild.updatedAt.getTime())) {
        console.warn(`E:${(args.iteration) ? (args.iteration + ':') : ('')}${guild._id}:forceUpdate:${args.forceUpdate}`);
        return
      }
      Object.assign(guild_original, guild.toObject())
      guild_original.status_code = 100;
    } else {
      guild = new GuildModel({
        _id: `${name_slug}@${realm.slug}`,
        name: capitalize(args.name),
        status_code: 100,
        realm: realm.slug,
        realm_id: realm._id,
        realm_name: realm.name,
        created_by: 'OSINT-getGuild',
        updated_by: 'OSINT-getGuild',
      })
    }

    //TODO continue

  } catch (e) {

  }
}

const updateLogsRoster = async (guild: GuildProps, guildLast: GuildProps) => {
  try {
    const gm_new: GuildMemberProps | undefined = guild.members.find(m => m.rank === 0);
    const gm_old: GuildMemberProps | undefined = guildLast.members.find(m => m.rank === 0);
    /** Guild Master have been changed */
    if (gm_old && gm_new && gm_old.id !== gm_new.id) {
      /** FIXME Update both GM ^^^priority */
    }
  } catch (e) {
    console.error(e)
  }
}

/**
 * Realm getter
 * @param args
 */
const getRealm = async <T extends RealmProps & BattleNetOptions & { population: boolean, wcl_ids?: Map<any, any> }> (args: T): Promise<void> => {
  const
    summary: RealmProps = { _id: args._id, slug: args.slug };
  try {
    let realm = await RealmModel.findById(args);

    if (!realm) {
      realm = new RealmModel({
        _id: args._id,
      });
    }

    const api = new BlizzAPI({
      region: args.region,
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      accessToken: args.accessToken
    });

    const response: ObjectProps = await api.query(`/data/wow/realm/${args.slug}`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'dynamic-eu' }
    });
    const keys: string[] = ['name', 'category', 'race', 'timezone', 'is_tournament', 'slug'];
    const keys_named: string[] = ['region', 'type'];
    await Promise.all(Object.entries(response).map(async ([key, value]) => {
      if (keys.includes(key) && value) summary[key] = value
      if (key === 'id' && value) {
        summary._id = value
      }
      if (key === 'name' && value) {
        if (typeof value === "string" && RealmsTicker.has(value)) summary.ticker = RealmsTicker.get(value);
        if (typeof value === "object" && "name" in value && RealmsTicker.has(value.name)) summary.ticker = RealmsTicker.get(value.name);
      }
      if (keys_named.includes(key) && typeof value === 'object' && value !== null && 'name' in value) {
        if (value.name) summary[key] = value.name
      }
      if (key === 'locale' && value) {
        summary.locale = value.match(/../g).join('_');
        if (value !== 'enGB') {
          const realm_locale: ObjectProps = await api.query(`/data/wow/realm/${args.slug}`, {
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
          const connected_realm: ConnectedRealmProps = await api.query(`/data/wow/connected-realm/${connected_realm_id}`, {
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

    Object.assign(realm, summary);

    if (args.wcl_ids && realm.name && args.wcl_ids.has(realm.name)) {
      realm.wcl_id = args.wcl_ids.get(realm.name)
    } else if (args.wcl_ids && realm.name_locale && args.wcl_ids.has(realm.name_locale)) {
      realm.wcl_id = args.wcl_ids.get(realm.name_locale)
    }

    if (!realm.isNew && args.population) {
      realm.population = await countRealmPopulation(realm.toObject());
      realm.markModified('population')
    }

    await realm.save()
  } catch (e) {
    console.error(e)
  }
}

/**
 * count realm population
 * @param args
 */
const countRealmPopulation = async <T extends RealmProps> (args: T): Promise<PopulationRealmProps> => {
  const population: PopulationRealmProps = {
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
      max_level: number = 60,
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
    population.characters_total.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug }));
    population.characters_active.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug, status_code: 200 }));
    population.characters_active_alliance.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug, status_code: 200, faction: 'Alliance' }));
    population.characters_active_horde.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug, status_code: 200, faction: 'Horde' }));
    population.characters_active_max_level.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug, status_code: 200, level: max_level }));
    population.characters_guild_members.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug, "guild": { "$ne": undefined } }));
    population.characters_guildless.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug, "guild": { $exists: false } })); //FIXME $exists: false?
    const players_unique = await CharacterModel.find({ 'realm.slug': args.slug }).distinct('personality');
    population.players_unique.push(players_unique.length);
    const players_active_unique = await CharacterModel.find({ 'realm.slug': args.slug, status_code: 200 }).distinct('personality');
    population.players_active_unique.push(players_active_unique.length);
    /**
     * Guild number
     * and their faction balance
     * TODO make sure that guild data always actual
     */
    population.guilds_total.push(await GuildModel.countDocuments({'realm.slug': args.slug}));
    population.guilds_alliance.push(await GuildModel.countDocuments({'realm.slug': args.slug, faction: 'Alliance'}));
    population.guilds_horde.push(await GuildModel.countDocuments({'realm.slug': args.slug, faction: 'Horde'}));

    /**
     * Class popularity among
     * every active character
     */
    for (const character_class of CharactersClasses) {

      const characters_classes = population.characters_classes.find( k => k._id === character_class);
      if (characters_classes) {
        characters_classes.value.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug, statusCode: 200, character_class: character_class }))
      } else {
        population.characters_classes.push({
          _id: character_class,
          value: [ await CharacterModel.countDocuments({ 'realm.slug': args.slug, statusCode: 200, character_class: character_class }) ]
        })
      }
    }

    /**
     * Measure crafting professions
     * for every active character
     */
    for (const { name, id } of CharactersProfessions) {

      const characters_professions = population.characters_classes.find( k => k._id === name);
      if (characters_professions) {
        characters_professions.value.push(await CharacterModel.countDocuments({ 'realm.slug': args.slug, status_code: 200, 'professions.id': id }))
      } else {
        population.characters_professions.push({
          _id: name,
          value: [ await CharacterModel.countDocuments({ 'realm.slug': args.slug, status_code: 200, 'professions.id': id }) ]
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
  } catch (error) {
    console.error(`E,${countRealmPopulation.name}:${error}`)
    return population;
  }
}

/**
 * getter for logs
 * @param args
 */

const getLog = async <T extends { _id: string, wcl: string } & BattleNetOptions> (args: T) => {
  try {
    const wcl_log = await axios.get(`https://www.warcraftlogs.com:443/v1/report/fights/${args._id}?api_key=${args.wcl}`).then(res => res.data || { exportedCharacters: [] });
    if (wcl_log && wcl_log.exportedCharacters && Array.isArray(wcl_log.exportedCharacters) && wcl_log.exportedCharacters.length) {
      const charactersLog : {name: string, server: string}[] = wcl_log.exportedCharacters;
      for (const character of charactersLog) {
        if (character.name && character.server) {
          //TODO priority
          await queueCharacters.add(
            `${character.name}@${character.server}`,
            {
              _id: `${character.name}@${character.server}`,
              name: character.name,
              realm: character.server,
              createdBy: `OSINT-logs`,
              updatedBy: `OSINT-logs`,
              guildRank: false,
              createOnlyUnique: true,
              region: 'eu',
              clientId: args.clientId,
              clientSecret: args.clientSecret,
              accessToken: args.accessToken,
            }, { jobId: `${character.name}@${character.server}` }
          );
        }
      }
    }
  } catch (e) {
    console.error(e)
  }
}

/**
 * place in index Q first two wowprogress pages
 */

const getLookingForGuild = async (): Promise<void> => {
  try {
    const key = await KeysModel.findOne({ tags: `index.lfg` });
    if (!key || !key.token) return
    const lfg_pages = await Promise.all([
      Tabletojson.convertUrl('https://www.wowprogress.com/gearscore/char_rating/lfg.1/sortby.ts').then(([tableData]) => {
        tableData.map((c: { Character: string, Realm: string }) => {
          if ('Character' in c && 'Realm' in c) {
            const character = {
              name: c.Character.trim(),
              realm: c.Realm.split('-')[1].trim(),
              createdBy: `OSINT-lfg`,
              updatedBy: `OSINT-lfg`,
              region: 'eu',
              clientId: key._id,
              clientSecret: key.secret,
              accessToken: key.token,
            }
            if (character) {
              //TODO add to character Q, guildRank, create onlyUnique?
            }
          }
        })
      }),
      Tabletojson.convertUrl('https://www.wowprogress.com/gearscore/char_rating/next/0/lfg.1/sortby.ts').then(([tableData]) => {
        tableData.map((c: { Character: string, Realm: string }) => {
          if ('Character' in c && 'Realm' in c) {
            const character = {
              name: c.Character.trim(),
              realm: c.Realm.split('-')[1].trim(),
              createdBy: `OSINT-LFG`,
              updatedBy: `OSINT-LFG`,
              region: 'eu',
              clientId: key._id,
              clientSecret: key.secret,
              accessToken: key.token,
            }
            if (character) {
              //TODO add to character Q
            }
          }
        })
      }),
    ])
    console.log(lfg_pages)
  } catch (e) {
    console.error(e)
  }
}

export { getCharacter, getRealmsWarcraftLogsID, getRealm, updateCharacterSummary, updateCharacterMedia, getLog, getLookingForGuild };
