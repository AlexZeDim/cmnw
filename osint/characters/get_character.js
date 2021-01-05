/**
 * Model importing
 */
const characters_db = require('../../db/models/characters_db');
const realms_db = require('../../db/models/realms_db');

/**
 * Modules
 */

const BlizzAPI = require('blizzapi');
const { toSlug, fromSlug } = require('../../db/setters');
const { detectiveDiffs, detectiveShadows } = require('./detectives')
const { updateSummary, updateMounts, updatePets, updateProfessions, updateMedia, updatePersonality } = require('./updaters');

/**
 * Request characters from Blizzard API and add it to OSINT-DB (guilds)
 * @param _id {string=}
 * @param id {number=}
 * @param name {string}
 * @param realm {Object<{_id: number, name: string, slug: string}>}
 * @param iterations {number=}
 * @param token {string=}
 * @param guildRank {Boolean=}
 * @param createOnlyUnique {Boolean=}
 * @param forceUpdate {Boolean=}
 * @param args {Object=}
 * @returns {Promise<{isNew}|*>}
 */
async function getCharacter ({ _id, id, name, realm, iterations, token, guildRank = false, createOnlyUnique = false, forceUpdate = false, ...args}) {
  try {
    const character_last = {};

    const realm_ = await realms_db
      .findOne(
        { $text: { $search: realm.slug } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()

    if (!realm_) return

    const name_slug = toSlug(name)

    /** Check if character exists */
    let character = await characters_db.findById(`${name_slug}@${realm_.slug}`);

    if (character) {

      /**
       * If guild rank true and character is exists
       * and lastModified from guild > character lastModified
       */
      if (guildRank) {
        if (args.guild) {
          if (character.guild && (character.guild.name === args.guild.name)) {
            character.guild.rank = args.guild.rank
          }
          if (!character.guild && character.lastModified && args.lastModified) {
            if (args.lastModified.getTime() > character.lastModified.getTime()) {
              character.guild = args.guild
            }
          }
          console.info(`G:${(iterations) ? (iterations + ':') : ('')}${character._id},guildRank:${guildRank}`)
          await character.save()
        }
      }

      /**
       * If character exists and createOnlyUnique initiated,
       * or updated recently return
       */
      if (createOnlyUnique) {
        console.warn(`E:${(iterations) ? (iterations + ':') : ('')}${character._id},createOnlyUnique:${createOnlyUnique}`);
        return character
      }

      if (!forceUpdate && new Date().getTime() - (48 * 60 * 60 * 1000) < character.updatedAt.getTime()) {
        console.warn(`E:${(iterations) ? (iterations + ':') : ('')}${character._id},forceUpdate:${forceUpdate}`);
        return character
      }

      /**
       * We create copy of character to compare it
       * with previous timestamp
       */
      Object.assign(character_last, character.toObject())
      character.statusCode = 100
      if (args.updatedBy) character.updatedBy = args.updatedBy
    } else {
      character = new characters_db({
        _id: `${name_slug}@${realm_.slug}`,
        id: Date.now(),
        name: fromSlug(name),
        statusCode: 100,
        createdBy: 'OSINT-getCharacter',
        updatedBy: 'OSINT-getCharacter',
      });
      /**
       * Upload other fields from imported values
       */
      if (id) character.id = id
      if (args.faction) character.faction = args.faction
      if (args.guild) character.guild = args.guild
      if (args.character_class) character.character_class = args.character_class
      if (args.level) character.level = args.level
      if (args.lastModified) character.lastModified = args.lastModified
      if (args.createdBy) character.createdBy = args.createdBy
      if (args.updatedBy) character.updatedBy = args.updatedBy
    }

    character.realm = {
      _id: realm_._id,
      name: realm_.name,
      slug: realm_.slug,
    };

    /**
     * BlizzAPI
     */
    const api = new BlizzAPI({
      region: 'eu',
      clientId: '530992311c714425a0de2c21fcf61c7d',
      clientSecret: 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP',
      accessToken: token
    });

    const character_status = await api.query(`/profile/wow/character/${character.realm.slug}/${name_slug}/status`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    }).catch(status_error => {
      if (status_error.response) {
        if (status_error.response.data && status_error.response.data.code) {
          character.statusCode = status_error.response.data.code
        }
      }
      if (character.isNew && character.createdBy.toString() === 'OSINT-userInput') {
        throw new Error(`${character._id},createOnlyUnique:${createOnlyUnique}`)
      }
    })
    /**
     * Define character id for sure
     */
    if (character_status && character_status.id) {
      character.id = character_status.id
      character.lastModified = character_status.lastModified
    }

    if (character_status && 'is_valid' in character_status && character_status.is_valid === true) {
      const [summary, pets_collection, mount_collection, professions, media] = await Promise.allSettled([
        updateSummary(name_slug, character.realm.slug, api),
        updatePets(name_slug, character.realm.slug, api),
        updateMounts(name_slug, character.realm.slug, api),
        updateProfessions(name_slug, character.realm.slug, api),
        updateMedia(name_slug, character.realm.slug, api)
      ]);

      /**
       * Summary
       */
      if (summary && summary.value) {

        Object.assign(character, summary.value)
        /**
         * Solving the guild problem
         * if guild in updated data not found
         * guild = undefined
         */
        if (summary.value.guild && summary.value.guild.name) {

          if (!character_last.guild && !character.guild.rank && guildRank === true) {
            await api.query(`data/wow/guild/${character.realm.slug}/${toSlug(summary.value.guild.name)}/roster`, {
              timeout: 10000,
              params: { locale: 'en_GB' },
              headers: { 'Battlenet-Namespace': 'profile-eu' }
            }).then (({members}) => {
              const { rank } = members.find(({ c }) => c.id === character.id);
              character.guild.rank = rank;
            }).catch(e => e);
          }

          /**
           * Inherit guild rank from previous value
           */
          if (character_last.guild && character_last.guild.name) {
            if (character_last.guild.name === summary.value.guild.name && character_last.guild.rank) character.guild.rank = parseInt(character_last.guild.rank)
          }
        }
        if (!summary.guild) {
          character.guild = undefined
        }
      }

      /**
       * Character Pets
       * Hash A & Hash B
       */
      if (pets_collection && pets_collection.value) {
        Object.assign(character, pets_collection.value)
        character.markModified('pets');
      }

      /**
       * Character Mounts
       */
      if (mount_collection && mount_collection.value) {
        Object.assign(character, mount_collection.value)
        character.markModified('mounts');
      }
      /**
       * Character Professions
       * On exist, reset current profession status
       */
      if (professions && professions.value) {
        Object.assign(character, professions.value)
        character.markModified('professions');
      }

      /**
       * Character Media
       * ID
       */
      if (media && media.value) {
        Object.assign(character, media.value)
      }
    }

    const characterObject = character.toObject();
    if (character.isNew) {
      await detectiveShadows(characterObject)
    } else {
      const character_current = { ...characterObject }
      await detectiveDiffs(character_last, character_current)
    }

    /**
     * Personalities Control
     */
    if (createOnlyUnique && !character.personality && character.hash_a) {
      const file = await updatePersonality(character._id, character.hash_a)
      Object.assign(character, file)
    }
    await character.save({ w: 1, j: true, wtimeout: 10000 })
    console.info(`${(character.isNew) ? ('C') : ('U')}:${(iterations) ? (iterations + ':') : ('')}${character._id}:${character.statusCode}`);
    return character;
  } catch (error) {
    console.error(`E,getCharacter,${_id},${error}`);
  }
}

module.exports = getCharacter;
