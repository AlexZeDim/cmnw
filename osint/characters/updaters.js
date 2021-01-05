/**
 * Mongo Models
 */

const characters_db = require('../../db/models/characters_db');
const personalities_db = require('../../db/models/personalities_db');

/**
 * Modules
 */

const crc32 = require('fast-crc32c');
const { toSlug } = require('../../db/setters');
const puppeteer = require('puppeteer');
const axios = require('axios');
const Xray = require('x-ray');

/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns media information about character
 */
const updateMedia = async (name_slug, realm_slug, BlizzAPI) => {
  try {
    const media = {};
    const response = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}/character-media`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || !response.assets) return media
    const { assets } = response;
    if (Array.isArray(assets) && assets.length) {
      media.media = {};
      assets.map(asset => {
        if (asset !== null && typeof asset === 'object') {
          if (asset.key && asset.key === 'avatar' && asset.value) {
            media.id = parseInt(
              asset.value
                .toString()
                .split('/')
                .pop()
                .match(/([0-9]+)/g)[0],
            )
            media.media.avatar_url = asset.value;
          }
          if (asset.key && asset.key === 'inset') media.media.bust_url = asset.value;
          if (asset.key && asset.key === 'main') media.media.render_url = asset.value;
        }
      })
    }
    return media
  } catch (error) {
    console.error(`E,${updateMedia.name},${name_slug}@${realm_slug}:${error}`)
    return {}
  }
}

/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns mount collection for the selected character
 */
const updateMounts = async (name_slug, realm_slug, BlizzAPI) => {
  try {
    const mounts_collection = {};
    const response = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/mounts`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || !response.mounts || !response.mounts.length) return mounts_collection
    const { mounts } = response;
    mounts_collection.mounts = []
    mounts.map(m => {
      if ('mount' in m) {
        mounts_collection.mounts.push({
          _id: m.mount.id,
          name: m.mount.name
        })
      }

    })
    return mounts_collection
  } catch (error) {
    console.error(`E,${updateMounts.name},${name_slug}@${realm_slug}:${error}`)
    return {}
  }
}

/**
 *
 * @param _id {string} character _id for updating DB document
 * @param hash_a {string} hash_a value for searching similarities
 * @returns {Promise<{}>} returns hash_f value and personality ID
 */
const updatePersonality = async (_id, hash_a) => {
  try {
    const file = {}
    if ( _id || !hash_a) return file
    const personalities = await characters_db.find({ hash_a: hash_a }).lean().distinct('personality');
    if (!personalities.length) {
      const persona = await personalities_db.create({
        aliases: [
          {
            type: 'character',
            value: _id
          }
        ]
      })
      file.hash_f = persona._id.toString().substr(-6)
      file.personality = persona._id;
    } else if (personalities.length === 1) {
      file.hash_f = personalities[0].toString().substr(-6)
      file.personality = personalities[0]
      await personalities_db.findByIdAndUpdate(file.personality, { '$addToSet': { 'aliases': { type: 'character', value: _id } } })
    } else {
      console.warn(`P,updatePersonality,${_id},updatePersonality:${personalities.length}`)
    }
    return file
  } catch (error) {
    console.error(`E,${updatePersonality.name},${_id}:${error}`)
    return {}
  }
}

/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns pets collection and hash values for the selected character
 */
const updatePets = async (name_slug, realm_slug, BlizzAPI) => {
  try {
    const hash_b = [];
    const hash_a = [];
    const pets_collection = {};
    const response = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/pets`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || !response.pets || !response.pets.length) return pets_collection
    pets_collection.pets = [];
    const { pets } = response;
    pets.map(pet => {
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
    })
    if (hash_b.length) pets_collection.hash_a = crc32.calculate(Buffer.from(hash_b.toString())).toString(16);
    if (hash_a.length) pets_collection.hash_b = crc32.calculate(Buffer.from(hash_a.toString())).toString(16);
    return pets_collection
  } catch (error) {
    console.error(`E,${updatePets.name},${name_slug}@${realm_slug}:${error}`)
    return {}
  }
}

/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns profession array for the requested character
 */
const updateProfessions = async (name_slug, realm_slug, BlizzAPI) => {
  try {
    const professions = {};
    const response = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}/professions`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response) return professions
    professions.professions = [];
    if ('primaries' in response) {
      const { primaries } = response
      if (Array.isArray(primaries) && primaries.length) {
        primaries.map(primary => {
          if (primary.profession && primary.profession.name && primary.profession.id) {
            const skill_tier = {
              name: primary.profession.name,
              id: primary.profession.id,
              tier: 'Primary'
            }
            if (primary.specialization && primary.specialization.name) skill_tier.specialization = primary.specialization.name
            professions.professions.push(skill_tier)
          }
          if ('tiers' in primary && Array.isArray(primary.tiers) && primary.tiers.length) {
            primary.tiers.map(tier => {
              if ('tier' in tier) {
                professions.professions.push({
                  id: tier.tier.id,
                  name: tier.tier.name,
                  skill_points: tier.skill_points,
                  max_skill_points: tier.max_skill_points,
                  tier: 'Primary Tier'
                })
              }
            })
          }
        })
      }
    }

    if ('secondaries' in response) {
      const { secondaries } = response
      if (Array.isArray(secondaries) && secondaries.length) {
        secondaries.map(secondary => {
          if (secondary.profession && secondary.profession.name && secondary.profession.id) {
            professions.professions.push({
              name: secondary.profession.name,
              id: secondary.profession.id,
              tier: 'Secondary'
            })
          }
          if ('tiers' in secondary && Array.isArray(secondary.tiers) && secondary.tiers.length) {
            secondary.tiers.map(tier => {
              if ('tier' in tier) {
                professions.professions.push({
                  id: tier.tier.id,
                  name: tier.tier.name,
                  skill_points: tier.skill_points,
                  max_skill_points: tier.max_skill_points,
                  tier: 'Secondary Tier'
                })
              }
            })
          }
        })
      }
    }
    return professions
  } catch (error) {
    console.error(`E,${updateProfessions.name},${name_slug}@${realm_slug}:${error}`)
    return {}
  }
}

/**
 *
 * @param name_slug {string} character name_slug
 * @param realm_slug {string} character realm_slug
 * @param BlizzAPI {Object} Blizzard API
 * @returns {Promise<{}>} returns summary status, like guild, realms and so on
 */
const updateSummary = async (name_slug, realm_slug, BlizzAPI) => {
  try {
    const summary = {}
    const response = await BlizzAPI.query(`/profile/wow/character/${realm_slug}/${name_slug}`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || typeof response !== 'object') return {}
    const keys_named = ['gender', 'faction', 'race', 'character_class', 'active_spec']
    const keys = ['level', 'achievement_points']
    Object.entries(response).forEach(([key, value]) => {
      if (keys_named.includes(key)) {
        if (value.name) summary[key] = value.name
      }
      if (keys.includes(key) && value !== null) summary[key] = value
      if (key === 'last_login_timestamp') summary.lastModified = value
      if (key === 'average_item_level') summary.average_item_level = value
      if (key === 'equipped_item_level') summary.equipped_item_level = value
      if (key === 'covenant_progress'  && typeof value === 'object' && value !== null) {
        if (value.chosen_covenant && value.chosen_covenant.name) summary.chosen_covenant = value.chosen_covenant.name;
        if (value.renown_level) summary.renown_level = value.renown_level;
      }
      if (key === 'guild' && typeof value === 'object' && value !== null) {
        if (value.id && value.name) {
          summary.guild = {};
          summary.guild.id = value.id;
          summary.guild.name = value.name;
          summary.guild._id = toSlug(`${value.name}@${realm_slug}`);
        }
      }
      if (key === 'realm' && typeof value === 'object' && value !== null) {
        if (value.id && value.name && value.slug) {
          summary.realm = {
            _id: value.id,
            name: value.name,
            slug: value.slug,
          }
        }
      }
      if (key === 'active_title' && typeof value === 'object' && value !== null) {
        if ('active_title' in value) {
          const { active_title } = value
          if (active_title.id) {
            summary.hash_t = parseInt(active_title.id, 16)
          }
        }
      }
    })
    summary.statusCode = 200;
    return summary
  } catch (error) {
    console.error(`E,${updateSummary.name},${name_slug}@${realm_slug}:${error}`)
    return {}
  }
}


/**
 * This is quite heavy CPU and RAM function, do not run concurrent!
 * @param name {string} first-uppercase character's name
 * @param realm_slug {string} realm slug for current character
 * @returns {Promise<{}>} return Mythic Logs Performance from Kihra's WarcraftLogs
 */
const updateWarcraftLogs = async (name, realm_slug) => {
  try {
    const warcraft_logs = {};
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
    console.error(`E,${updateWarcraftLogs.name},${name}@${realm_slug}:${error}`)
    return {}
  }
}

/**
 *
 * @param name {string} first-uppercase character's name
 * @param realm_slug {string} realm slug for current character
 * @returns {Promise<{}>}
 */
const updateWProgress = async (name, realm_slug) => {
  try {
    const wow_progress = {};
    const x = Xray();
    const wowprogress = await x(encodeURI(`https://www.wowprogress.com/character/eu/${realm_slug}/${name}`), '.registeredTo', ['.language']);
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
      if (key === 'Languages') wow_progress.languages = value.split(',').map(s => s.trim())
    }))
    return wow_progress
  } catch (error) {
    console.error(`E,${updateWProgress.name},${name}@${realm_slug}:${error}`)
    return {}
  }
}

/**
 *
 * @param name {string} first-uppercase character's name
 * @param realm_slug {string} realm slug for current character
 * @returns {Promise<{}>}
 */
const updateRaiderIO = async (name, realm_slug) => {
  try {
    const raider_io = {};
    const response = await axios.get(encodeURI(`https://raider.io/api/v1/characters/profile?region=eu&realm=${realm_slug}&name=${name}&fields=mythic_plus_scores_by_season:current,raid_progression`));
    if (!response || !response.data) return raider_io
    if ('raid_progression' in response.data) {
      const raid_progress = response.data['raid_progression'];
      const pve_progress = {};
      for (const [key, value] of Object.entries(raid_progress)) {
        pve_progress[key] = value['summary']
      }
      raider_io.progress = pve_progress;
    }
    if ('mythic_plus_scores_by_season' in response.data) {
      const rio_score = response.data['mythic_plus_scores_by_season']
      if (rio_score && rio_score.length) {
        for (const rio of rio_score) {
          if ('scores' in rio) {
            raider_io.rio = rio.scores.all
          }
        }
      }
    }
    return raider_io
  } catch (error) {
    console.error(`E,${updateRaiderIO.name},${name}@${realm_slug}:${error}`)
    return {}
  }
}

module.exports = { updateSummary, updateMedia, updateMounts, updatePets, updateProfessions, updatePersonality, updateWarcraftLogs, updateWProgress, updateRaiderIO }
