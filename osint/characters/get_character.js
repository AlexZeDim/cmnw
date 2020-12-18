/**
 * Model importing
 */
const characters_db = require('../../db/models/characters_db');
const realms_db = require('../../db/models/realms_db');
const personalities_db = require('../../db/models/personalities_db');

/**
 * Modules
 */

const crc32 = require('fast-crc32c');
const BlizzAPI = require('blizzapi');
const { toSlug, fromSlug } = require('../../db/setters');
const shadowCharacters = require('./shadow_characters');
const detectiveCharacters = require('./detective_characters');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 * Request characters from Blizzard API and add it to OSINT-DB (guilds)
 * @param _id {string=}
 * @param id {number=}
 * @param name {string}
 * @param realm {Object<{_id: number, name: string, slug: string}>}
 * @param iterations {number=}
 * @param token {string}
 * @param guildRank {Boolean=}
 * @param createOnlyUnique {Boolean=}
 * @param forceUpdate {Boolean=}
 * @param args {Object=}
 * @returns {Promise<void>}
 */


async function getCharacter ({ _id, id, name, realm, iterations, token, guildRank = false, createOnlyUnique = false, forceUpdate = false, ...args}) {
  try {
    const character_last = {};

    const realm_ = await realms_db.findOne({ $text: { $search: realm.slug } }, { _id: 1, slug: 1, name: 1 });

    if (!realm_) return

    const name_slug = toSlug(name)

    /** Check if character exists */
    let character = await characters_db.findById(`${name_slug}@${realm_.slug}`);

    if (character) {

      /**
       * If character exists and createOnlyUnique initiated,
       * or updated recently return
       */
      if (createOnlyUnique) {
        console.warn(`E:${name}@${character.realm.name}#${character._id}:${createOnlyUnique}`);
        return
      }

      if (!forceUpdate && new Date().getTime() - (48 * 60 * 60 * 1000) < character.updatedAt.getTime()) return

      Object.assign(character_last, character.toObject())
      character.statusCode = 100
      if (args.updatedBy) character.updatedBy = args.updatedBy
    } else {
      character = new characters_db({
        _id: `${name_slug}@${realm.slug}`,
        id: Date.now(),
        name: fromSlug(name),
        statusCode: 100,
        createdBy: 'OSINT-getCharacter',
        updatedBy: 'OSINT-getCharacter',
        isWatched: false,
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
      clientId: clientId,
      clientSecret: clientSecret,
      accessToken: token
    });

    const character_status = await api.query(`/profile/wow/character/${character.realm.slug}/${name_slug}/status`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    }).catch(() => { if (character.isNew && character.createdBy.toString() === 'OSINT-userInput') throw new Error(`${name}@${character.realm.slug}:${createOnlyUnique}`) })

    /**
     * Define character id for sure
     */
    if (character_status && character_status.id) {
      character.id = character_status.id
      character.lastModified = character_status.lastModified
    }

    if (character_status && 'is_valid' in character_status) {
      const [summary, pets_collection, mount_collection, professions, media] = await Promise.allSettled([
        api.query(`/profile/wow/character/${character.realm.slug}/${name_slug}`, {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${character.realm.slug}/${name_slug}/collections/pets`, {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${character.realm.slug}/${name_slug}/collections/mounts`, {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${character.realm.slug}/${name_slug}/professions`, {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${character.realm.slug}/${name_slug}/character-media`, {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        })
      ]);

      /**
       * Summary
       */
      if (summary && summary.value) {
        if (summary.value.faction && summary.value.faction.name) character.faction = summary.value.faction.name
        if (summary.value.gender && summary.value.gender.name) character.gender = summary.value.gender.name
        if (summary.value.race && summary.value.race.name) character.race = summary.value.race.name
        if (summary.value.character_class && summary.value.character_class.name) character.character_class = summary.value.character_class.name
        if ('active_spec' in summary.value && summary.value.active_spec.name) character.spec = summary.value.active_spec.name
        if (summary.value.id) character.id = summary.value.id
        if (summary.value.name) character.name = summary.value.name
        if (summary.value.level) character.level = summary.value.level
        if ('covenant_progress' in summary.value) {
          if ('chosen_covenant' in summary.value.covenant_progress) {
            if (summary.value.covenant_progress.chosen_covenant.name) character.covenant.chosen_covenant = summary.value.covenant_progress.chosen_covenant.name;
          }
          if ('renown_level' in summary.value.covenant_progress) character.covenant.renown_level = summary.value.covenant_progress.renown_level
        }
        if ('last_login_timestamp' in summary.value) character.lastModified = new Date(summary.value['last_login_timestamp'])
        if ('average_item_level' in summary.value && 'equipped_item_level' in summary.value) {
          character.ilvl = {};
          character.ilvl.avg = summary.value['average_item_level']
          character.ilvl.eq = summary.value['equipped_item_level']
        }

        character.statusCode = 200;

        /**
         * Active title
         * Hash T
         */
        if ('active_title' in summary.value) {
          let { active_title } = summary.value
          if (active_title.id) {
            character.hash.t = parseInt(active_title.id, 16);
          }
        }

        /**
         * Realm
         * Sometimes Blizzard return null values
         */
        if (summary.value.realm && summary.value.realm.name !== null) {
          character.realm = {
            _id: summary.value.realm.id,
            name: summary.value.realm.name,
            slug: summary.value.realm.slug,
          };
        }

        /**
         * Guild
         */
        if (summary.value.guild) {
          character.guild.name = summary.value.guild.name;
          character.guild.slug = summary.value.guild.name;
          character.guild._id = `${toSlug(character.guild.name)}@${character.realm.slug}`;
          if (guildRank === true) {
            await api.query(`data/wow/guild/${character.realm.slug}/${toSlug(character.guild.name)}/roster`, {
              timeout: 10000,
              params: { locale: 'en_GB' },
              headers: { 'Battlenet-Namespace': 'profile-eu' }
            })
            .then (({members}) => {
              const { rank } = members.find(({ character }) => character.id === character.id);
              character.guild.rank = rank;
            })
            .catch(e => e);
          }
        } else {
          character.guild = undefined;
        }
      }

      /**
       * Character Pets
       * Hash A & Hash C
       */
      if (pets_collection && pets_collection.value) {
        const collection_pets = [];
        const active_pets = [];

        const { pets } = pets_collection.value;

        if (pets && pets.length) {
          character.pets = undefined;
          character.pets = [];

          for (const pet of pets) {

            character.pets.addToSet({
              _id: pet.id,
              name: pet.species.name,
            })

            if ('is_active' in pet) {
              if ('name' in pet) {
                active_pets.push(pet.name);
              }
              active_pets.push(pet.species.name, pet.level);
            }
            if ('name' in pet) {
              collection_pets.push(pet.name);
            }
            collection_pets.push(pet.species.name, pet.level);
          }
          if (collection_pets.length) character.hash.a = crc32.calculate(Buffer.from(collection_pets.toString())).toString(16);
          if (active_pets.length) character.hash.b = crc32.calculate(Buffer.from(active_pets.toString())).toString(16);
        }
      }

      /**
       * Character Mounts
       * Hash B
       */
      if (mount_collection && mount_collection.value) {
        const collection_mounts = [];

        const { mounts } = mount_collection.value;

        if (mounts && mounts.length) {
          character.mounts = undefined;
          character.mounts = [];

          for (const { mount } of mounts) {
            character.mounts.addToSet({
              _id: mount.id,
              name: mount.name
            })

            collection_mounts.push(mount.id);
          }
          if (collection_mounts.length) character.hash.с = crc32.calculate(Buffer.from(collection_mounts.toString())).toString(16);
        }
      }
      /**
       * Character Professions
       * On exist, reset current profession status
       */
      if (professions && professions.value) {
        character.professions = undefined;
        character.professions = [];
        if ('primaries' in professions.value) {
          const professions_primary = professions.value.primaries
          if (professions_primary && professions_primary.length) {
            for (const primary of professions_primary) {
              if (primary.profession && primary.profession.name && primary.profession.id) {
                const skill_tier = {
                  name: primary.profession.name,
                  id: primary.profession.id,
                  tier: 'Primary'
                }
                if (primary.specialization && primary.specialization.name) skill_tier.specialization = primary.specialization.name
                character.professions.push(skill_tier)
              }
              if ('tiers' in primary && primary.tiers.length) {
                for (const tier of primary.tiers) {
                  if ('tier' in tier) {
                    character.professions.push({
                      id: tier.tier.id,
                      name: tier.tier.name,
                      skill_points: tier.skill_points,
                      max_skill_points: tier.max_skill_points,
                      tier: 'Primary Tier'
                    })
                  }
                }
              }
            }
          }
        }
        if ('secondaries' in professions.value) {
          const professions_secondary = professions.value.secondaries
          if (professions_secondary && professions_secondary.length) {
            for (const secondary of professions_secondary) {
              if (secondary.profession && secondary.profession.name && secondary.profession.id) {
                character.professions.push({
                  name: secondary.profession.name,
                  id: secondary.profession.id,
                  tier: 'Secondary'
                })
              }
              if ('tiers' in secondary && secondary.tiers.length) {
                for (const tier of secondary.tiers) {
                  if ('tier' in tier) {
                    character.professions.push({
                      id: tier.tier.id,
                      name: tier.tier.name,
                      skill_points: tier.skill_points,
                      max_skill_points: tier.max_skill_points,
                      tier: 'Primary Tier'
                    })
                  }
                }
              }
            }
          }
        }
      }

      /**
       * Character Media
       * ID
       */
      if (media && media.value && media.value.assets) {
        const assets = media.value.assets;
        if (assets && assets.length) {
          let avatar_url, bust_url, render_url;
          for (const { key , value } of assets) {
            if (key === 'avatar' && value) {
              if (!character.id) {
                character.id = parseInt(
                  value
                    .toString()
                    .split('/')
                    .pop()
                    .match(/([0-9]+)/g)[0],
                );
              }
              avatar_url = value;
            }
            if (key === 'inset') {
              bust_url = value;
            }
            if (key === 'main') {
              render_url = value;
            }
          }
          character.media = {
            avatar_url: avatar_url,
            bust_url: bust_url,
            render_url: render_url,
          };
        }
      }
    } else {
      character.statusCode = 400;
    }

    /**
     * Hash.ex
     */
    if (character.id && character.character_class) {
      const hash_ex = [character.id, character.character_class];
      character.hash.ex = crc32.calculate(Buffer.from(hash_ex.toString())).toString(16);
    }

    if (character.isNew) {
      const shadowCharacter = { ...character.toObject(), ...{ token: token }}
      await shadowCharacters(shadowCharacter)
    } else {
      const character_current = { ...character.toObject() }
      await detectiveCharacters(character_last, character_current)
    }

    /**
     * Personalities Control
     */
    if (createOnlyUnique) {
      if (!character.personality && character.hash && character.hash.a) {
        const personalities = await characters_db.find({ 'hash.a': character.hash.a }).lean().distinct('personality');
        if (!personalities.length) {
          const persona = await personalities_db.create({
            aliases: [
              {
                type: 'character',
                value: character._id
              }
            ]
          })
          character.personality = persona._id;
        } else if (personalities.length === 1) {
          character.personality = personalities[0]
          await personalities_db.findByIdAndUpdate(character.personality, { '$push': { 'aliases': { type: 'character', value: character._id } } })
        } else {
          console.warn(`P:${character.name}@${character.realm.name} personalities: ${personalities.length}`)
        }
      }
    }

    character.markModified('pets');
    character.markModified('mounts');
    character.markModified('professions');
    await character.save({ w: 1, j: true, wtimeout: 10000 })
    console.info(`U:${(iterations) ? (iterations + ':') : ('')}${character.name}@${character.realm.name}#${character.id}:${character.statusCode}`);
  } catch (error) {
    console.error(`E,getCharacter,${error}`);
  }
}

module.exports = getCharacter;
