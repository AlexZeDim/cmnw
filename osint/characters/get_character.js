/**
 * Model importing
 */
const characters_db = require('../../db/models/characters_db');
const realms_db = require('../../db/models/realms_db');


/**
 * Modules
 */

const crc32 = require('fast-crc32c');
const BlizzAPI = require('blizzapi');
const { toSlug, fromSlug } = require('../../db/setters');
const detectiveCharacters = require('./detective_characters');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 * Request characters from Blizzard API and add it to OSINT-DB (guilds)
 * @param character_ {Object} - provides any additional data for requested character
 * @param token {String} - provide a battle.net token
 * @param guildRank {Boolean} - if this value true, we will request guild roster to check guild rank of this character
 * @param createOnlyUnique {Boolean} - if value is true, we create characters only that doesn't exist. Ignore update dont update them.
 * @param i {Number}
 */


async function getCharacter (
  character_ = {},
  token = '',
  guildRank = false,
  createOnlyUnique = false,
  i = 0
) {
  try {
    const characterOld = {};

    const realm = await realms_db.findOne({ $text: { $search: character_.realm.slug } }, { _id: 1, slug: 1, name: 1 });

    if (!realm) {
      return
    }

    const name_slug = toSlug(character_.name)

    /** Check if character exists */
    let character = await characters_db.findById(`${name_slug}@${realm.slug}`);

    if (character) {
      /** If character exists and createOnlyUnique initiated, then return */
      if (createOnlyUnique) {
        console.info(`E:${character.name}@${character.realm.name}#${character.id}:${createOnlyUnique}`);
        return
      }
      Object.assign(characterOld, character.toObject())
      character.statusCode = 100
    } else {
      character = new characters_db({
        _id: `${name_slug}@${realm.slug}`,
        name: fromSlug(character_.name),
        id: Date.now(),
        statusCode: 100,
        createdBy: 'OSINT-getCharacter',
        updatedBy: 'OSINT-getCharacter',
        isWatched: false,
      });
      /**
       * Upload other fields from imported values
       */
      if (character_.id) {
        character.id = character_.id
      }
      if (character_.faction) {
        character.faction = character_.faction
      }
      if (character_.character_class) {
        character.character_class = character_.character_class
      }
      if (character_.level) {
        character.level = character_.level
      }
      if (character_.lastModified) {
        character.lastModified = character_.lastModified
      }
      if (character_.createdBy) {
        character.createdBy = character_.createdBy
      }
      if (character_.updatedBy) {
        character.updatedBy = character_.updatedBy
      }
    }

    if (realm) {
      character.realm = {
        _id: realm._id,
        name: realm.name,
        slug: realm.slug,
      };
    }

    /**
     * BlizzAPI
     */
    const api = new BlizzAPI({
      region: 'eu',
      clientId: clientId,
      clientSecret: clientSecret,
      accessToken: token,
      onAccessTokenExpired: () => { console.error('TOKEN EXPIRED') },
      onAccessTokenRefresh: () => {  console.error('TOKEN onAccessTokenRefresh') },
    });

    const character_status = await api.query(`/profile/wow/character/${character.realm.slug}/${name_slug}/status`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })

    /** Define character id for sure */
    if (character_status && character_status.id) {
      character.id = character_status.id
      character.lastModified = character_status.lastModified
    }

    if (character_status && 'is_valid' in character_status) {
      const [characterData, characterPets, characterMount, characterMedia] = await Promise.allSettled([
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
        api.query(`/profile/wow/character/${character.realm.slug}/${name_slug}/character-media`, {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        })
      ]);

      /**
       * Character Data
       */
      if (characterData && characterData.value) {
        if (Object.keys(characterData.value).length) {
          if (characterData.value.faction && characterData.value.faction.name) {
            character.faction = characterData.value.faction.name
          }
          if (characterData.value.gender && characterData.value.gender.name) {
            character.gender = characterData.value.gender.name
          }
          if (characterData.value.race && characterData.value.race.name) {
            character.race = characterData.value.race.name
          }
          if (characterData.value.character_class && characterData.value.character_class.name) {
            character.character_class = characterData.value.character_class.name
          }
          if ('active_spec' in characterData.value && characterData.value.active_spec.name) {
            character.spec = characterData.value.active_spec.name
          }
          if (characterData.value.id) {
            character.id = characterData.value.id
          }
          if (characterData.value.name) {
            character.name = characterData.value.name
          }
          if (characterData.value.level) {
            character.level = characterData.value.level
          }
          if ('last_login_timestamp' in characterData.value) {
            character.lastModified = new Date(characterData.value['last_login_timestamp'])
          }
          if ('average_item_level' in characterData.value && 'equipped_item_level' in characterData.value) {
            character.ilvl = {};
            character.ilvl.avg = characterData.value['average_item_level']
            character.ilvl.eq = characterData.value['equipped_item_level']
          }
        }

        character.statusCode = 200;

        /**
         * Active title
         * Hash T
         */
        if ('active_title' in characterData.value) {
          let { active_title } = characterData.value
          if (active_title.id) {
            character.hash.t = parseInt(active_title.id, 16);
          }
        }

        /**
         * Realm
         * Sometimes Blizzard return null values
         */
        if (characterData.value.realm && characterData.value.realm.name !== null) {
          character.realm = {
            _id: characterData.value.realm.id,
            name: characterData.value.realm.name,
            slug: characterData.value.realm.slug,
          };
        }

        /**
         * Guild
         */
        if (characterData.value.guild) {
          character.guild._id = characterData.value.guild.id;
          character.guild.name = characterData.value.guild.name;
          character.guild.slug = characterData.value.guild.name;
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
      if (characterPets && characterPets.value) {
        let pets_array = [];
        let active_pets = [];
        let names_a = [];
        let names_c = [];

        let { pets } = characterPets.value;

        if (pets && pets.length) {
          for (let pet of pets) {
            if ('is_active' in pet) {
              if ('name' in pet) {
                active_pets.push(pet.name);
                names_c.push(pet.name, pet.level);
              }
              active_pets.push(pet.species.name, pet.level);
            }
            if ('name' in pet) {
              pets_array.push(pet.name);
              names_a.push(pet.name, pet.level)
            }
            pets_array.push(pet.species.name, pet.level);
          }

          if (names_c.length > 2) {
            character.hash.c = crc32.calculate(Buffer.from(names_c.toString())).toString(16);
          } else if (active_pets.length) {
            character.hash.c = crc32.calculate(Buffer.from(active_pets.toString())).toString(16);
          }

          if (names_a.length > 2) {
            character.hash.a = crc32.calculate(Buffer.from(names_a.toString())).toString(16);
          } else if (pets_array.length) {
            character.hash.a = crc32.calculate(Buffer.from(pets_array.toString())).toString(16);
          }
        }
      }

      /**
       * Character Mounts
       * Hash B
       */
      if (characterMount && characterMount.value) {
        let mount_array = [];

        let { mounts } = characterMount.value;

        if (mounts && mounts.length) {
          for (let mount of mounts) {
            mount_array.push(mount.id);
          }
          character.hash.b = crc32.calculate(Buffer.from(mount_array.toString())).toString(16);
        }
      }

      /**
       * Character Media
       * ID
       */
      if (characterMedia && characterMedia.value && characterMedia.value.assets) {
        const assets = characterMedia.value.assets;
        if (assets && assets.length) {
          let avatar_url, bust_url, render_url;
          for (let { key , value } of assets) {
            if (key === 'avatar') {
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
      let hash_ex = [character.id, character.character_class];
      character.hash.ex = crc32.calculate(Buffer.from(hash_ex.toString())).toString(16);
    }

    if (character.isNew) {
      /**
       * If we found rename within one realm and anything else
       */
      const renamedCopy = await characters_db.findOne({
        'realm.slug': character.realm.slug,
        id: character.id,
        character_class: character.character_class,
      });
      if (renamedCopy) {
        await detectiveCharacters(renamedCopy.toObject(), character.toObject())
        await characters_db.deleteOne({ _id: renamedCopy._id });
      } else {
        /** Setting confidence and flag */
        let transfer_flag = false;
        let confidence = 0;
        let transfer_character;
        /**
         * Transfer without rename
         * allows us to find yourself in past
         */
        let transfer_query = {
          'realm.slug': { "$ne": character.realm.slug },
          name: character.name,
          character_class: character.character_class,
          level: character.level,
        };
        if (character.hash.a) {
          Object.assign(transfer_query, {'hash.a': character.hash.a})
        }
        if (character.hash.c) {
          Object.assign(transfer_query, {'hash.c': character.hash.c})
        }
        /***
         * If criteria is > 4 of 6
         */
        if (Object.keys(transfer_query).length > 4) {
          const transferCopy = await characters_db.find(transfer_query);

          if (transferCopy && transferCopy.length) {

            let transferArray = [];

            /**
             * Request for every character that has been found by query
             * and check it on 404 status, if 404 - transfer has been made
             */
            for (let transferCopyElement of transferCopy) {
              await api.query(`/profile/wow/character/${transferCopyElement.realm.slug}/${toSlug(transferCopyElement.name)}/status`, {
                timeout: 10000,
                params: { locale: 'en_GB' },
                headers: { 'Battlenet-Namespace': 'profile-eu' }
              }).catch(() => transferArray.push(transferCopyElement));
            }

            confidence = 1 / transferArray.length;

            if (transferArray.length) {
              /** if more then 50% */
              if (confidence > 0.5) {
                transfer_flag = true;
                transfer_character = transferArray[0]
              } else {
                let t_flag = false;
                if (character.hash && character.hash.t) {
                  t_flag = true;
                }
                for (let transferArrayElement of transferArray) {
                  /** If character has T */
                  if (t_flag) {
                    /** Check for rejected T */
                    if (transferArrayElement.hash && transferArrayElement.hash.t) {
                      if (character.hash.t === transferArrayElement.hash.t) {
                        transfer_flag = true
                        transfer_character = transferArrayElement
                        break
                      }
                    }
                  } else {
                    /** If character has no T and rejected character has no T also */
                    if (transferArrayElement.hash && !transferArrayElement.hash.t) {
                      transfer_flag = true
                      transfer_character = transferArrayElement
                      break
                    }
                  }
                }
              }
            }
            /**
             * if else, we can't detect it
             *
             * if transfer flag === true
             * */
            if (transfer_flag) {
              await detectiveCharacters(transfer_character.toObject(), character.toObject())
              await characters_db.deleteOne({ _id: transfer_character._id });
            }
          } else {
            /**
             * If transfer has been made rename, then
             * search via shadow_query
             */
            let shadow_query = {
              'realm.slug': { $ne: character.realm.slug },
              name: { $ne: character.name },
              character_class: character.character_class,
              level: character.level,
            };
            if (character.hash.a) {
              Object.assign(shadow_query, {'hash.a': character.hash.a})
            }
            if (character.hash.c) {
              Object.assign(shadow_query, {'hash.c': character.hash.c})
            }
            /**
             * If criteria is > 4 of 6
             */
            if (Object.keys(shadow_query).length > 4) {
              const shadowCopy = await characters_db.find(shadow_query);
              /**
               * If we found shadowCopy characters with have the same
               * hashed, level, statusCode and class
               */
              if (shadowCopy && shadowCopy.length) {

                let shadowArray = [];

                /**
                 * Request for every character that has been found by query
                 * and check it on 404 status, if 404 - transfer has been made
                 */
                for (let shadowCopyElement of shadowCopy) {
                  await api.query(`/profile/wow/character/${shadowCopyElement.realm.slug}/${toSlug(shadowCopyElement.name)}/status`, {
                    timeout: 10000,
                    params: { locale: 'en_GB' },
                    headers: { 'Battlenet-Namespace': 'profile-eu' }
                  }).catch(() => shadowArray.push(shadowCopyElement));
                }

                confidence = 1 / shadowArray.length;

                if (shadowArray.length) {
                  /** if more then 50% */
                  if (confidence > 0.5) {
                    transfer_flag = true;
                    transfer_character = shadowArray[0]
                  } else {
                    let t_flag = false;
                    if (character.hash && character.hash.t) {
                      t_flag = true;
                    }
                    for (let shadowArrayElement of shadowArray) {
                      /** If character has T */
                      if (t_flag) {
                        /** Check for rejected T */
                        if (shadowArrayElement.hash && shadowArrayElement.hash.t) {
                          if (character.hash.t === shadowArrayElement.hash.t) {
                            transfer_flag = true
                            transfer_character = shadowArrayElement
                            break
                          }
                        }
                      } else {
                        /** If character has no T and rejected character has no T also */
                        if (shadowArrayElement.hash && !shadowArrayElement.hash.t) {
                          transfer_flag = true
                          transfer_character = shadowArrayElement
                          break
                        }
                      }
                    }
                  }
                }

                /**
                 * if else, we can't detect it
                 *
                 * if transfer flag === true
                 * */
                if (transfer_flag) {
                  await detectiveCharacters(transfer_character.toObject(), character.toObject())
                  await characters_db.deleteOne({ _id: transfer_character._id });
                }
              }
            }
          }
        }
      }
    } else {
      await detectiveCharacters(characterOld, character.toObject())
    }

    character.markModified('realm');
    character = await character.save({ w: 1, j: true, wtimeout: 100000 })
    console.info(`U:${i}:${character.name}@${character.realm.name}#${character.id}:${character.statusCode}`);
  } catch (error) {
    console.error(`E,${error}`);
  }
}

module.exports = getCharacter;
