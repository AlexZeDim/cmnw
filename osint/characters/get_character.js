/**
 * Model importing
 */
require('../../db/connection')
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
 * @param character {Object} - provides any additional data for requested character
 * @param token {String} - provide a battle.net token
 * @param guildRank {Boolean} - if this value true, we will request guild roster to check guild rank of this character
 * @param createOnlyUnique {Boolean} - if value is true, we create characters only that doesn't exist. Ignore update dont update them.
 */


async function getCharacter (
  character = {},
  token = '',
  guildRank = false,
  createOnlyUnique = false,
) {
  try {
    let character_Old;

    const _id = toSlug(`${character.name}@${character.realm.slug}`)

    /** Check if character exists */
    let character_ = await characters_db.findById(_id);

    if (character_) {
      character_Old = { ...character_.toObject() }
    } else {
      character_ = new characters_db({
        _id: _id,
        name: fromSlug(character.name),
        id: Date.now(),
        statusCode: 100,
        createdBy: 'OSINT-getCharacter',
        updatedBy: 'OSINT-getCharacter',
        isWatched: false,
      });
      /**
       * Upload other fields from imported values
       */
      if (character_ && Object.keys(character).length) {
        let character_fields = [
          'id',
          'guild',
          'faction',
          'character_class',
          'level',
          'lastModified',
          'createdBy',
          'updatedBy'
        ];
        for (let field of character_fields) {
          if (field in character_) {
            character_[field] = character[field];
          }
        }
      }
    }

    /** If character exists and createOnlyUnique initiated, then return */
    if (character_ && createOnlyUnique) {
      console.info(`E:${character_.name}@${character_.realm.name}#${character_.id}:${character_.statusCode}`);
      return
    }

    let realm = await realms_db.findOne({ $text: { $search: character.realm.slug } }, { _id: 0, slug: 1, name: 1 }).lean();
    if (realm) {
      character_.realm = realm
    } else {
      return
    }

    /**
     * BlizzAPI
     */
    const api = new BlizzAPI({
      region: 'eu',
      clientId: clientId,
      clientSecret: clientSecret,
      accessToken: token
    });

    const character_status = await api.query(`/profile/wow/character/${character_.realm.slug}/${toSlug(character_.name)}/status`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    }).catch()

    /** Define character id for sure */
    if (character_status && character_status.id) {
      character_.id = character_status.id
      character_.lastModified = character_status.lastModified
    }

    if (character_status) {
      const [characterData, characterPets, characterMount, characterMedia] = await Promise.allSettled([
        api.query(`/profile/wow/character/${character_.realm.slug}/${character.name}`, {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${character_.realm.slug}/${character.name}/collections/pets`, {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${character_.realm.slug}/${character.name}/collections/mounts`, {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${character_.realm.slug}/${character.name}/character-media`, {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        })
      ]);

      /**
       * Character Data
       */
      if (characterData && characterData.value) {
        if (Object.keys(characterData.value).length) {
          let character_fields_name = [
            'faction',
            'gender',
            'race',
            'character_class',
            'active_spec',
          ];
          for (let field of character_fields_name) {
            if (field in characterData.value) {
              character_[field] = characterData.value[field].name;
            }
          }
          let character_fields = [
            'id',
            'name',
            'level',
            'last_login_timestamp',
            'average_item_level',
            'equipped_item_level',
          ];
          for (let field of character_fields) {
            if (field in characterData.value) {
              if (field === 'last_login_timestamp') {
                character_[field] = new Date(characterData.value[field]);
              } else {
                character_[field] = characterData.value[field];
              }
            }
          }
        }
        character_.statusCode = 200;

        /**
         * Active title
         * Hash T
         */
        if ('active_title' in characterData.value) {
          let { active_title } = characterData.value
          if (active_title.id) {
            character_.hash.t = parseInt(active_title.id, 16);
          }
        }

        /**
         * Realm
         * Sometimes Blizzard return null values
         */
        if (characterData.value.realm.name !== null) {
          character_.realm = {
            id: characterData.value.realm.id,
            name: characterData.value.realm.name,
            slug: characterData.value.realm.slug,
          };
        }

        /**
         * Guild
         */
        if (characterData.value.guild) {
          character_.guild._id = characterData.value.guild.id;
          character_.guild.name = characterData.value.guild.name;
          character_.guild.slug = characterData.value.guild.name;
          if (guildRank === true) {
            await api.query(`data/wow/guild/${character_.realm.slug}/${toSlug(character_.guild.name)}/roster`, {
              timeout: 10000,
              params: { locale: 'en_GB' },
              headers: { 'Battlenet-Namespace': 'profile-eu' }
            })
              .then (({members}) => {
                const { rank } = members.find(({ character }) => character.id === character_.id);
                character_.guild.rank = rank;
              })
              .catch(e => e);
          }
        } else {
          character_.guild = undefined;
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
            character_.hash.c = crc32.calculate(Buffer.from(names_c.toString())).toString(16);
          } else if (active_pets.length) {
            character_.hash.c = crc32.calculate(Buffer.from(active_pets.toString())).toString(16);
          }

          if (names_a.length > 2) {
            character_.hash.a = crc32.calculate(Buffer.from(names_a.toString())).toString(16);
          } else if (pets_array.length) {
            character_.hash.a = crc32.calculate(Buffer.from(pets_array.toString())).toString(16);
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
          character_.hash.b = crc32.calculate(Buffer.from(mount_array.toString())).toString(16);
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
              if (!character_.id) {
                character_.id = parseInt(
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
          character_.media = {
            avatar_url: avatar_url,
            bust_url: bust_url,
            render_url: render_url,
          };
        }
      }
    }

    /**
     * Hash.ex
     */
    if (character_.id && character_.character_class) {
      let hash_ex = [character_.id, character_.character_class];
      character_.hash.ex = crc32.calculate(Buffer.from(hash_ex.toString())).toString(16);
    }

    if (character_.isNew) {
      /**
       * If we found rename within one realm and anything else
       */
      const renamedCopy = await characters_db.findOne({
        'realm.slug': character_.realm.slug,
        id: character_.id,
        character_class: character_.character_class,
      });
      if (renamedCopy) {
        await detectiveCharacters(renamedCopy, character_)
        renamedCopy.deleteOne();
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
          'realm.slug': { "$ne": character_.realm.slug },
          name: character_.name,
          character_class: character_.character_class,
          level: character_.level,
        };
        if (character_.hash.a) {
          Object.assign(transfer_query, {'hash.a': character_.hash.a})
        }
        if (character_.hash.c) {
          Object.assign(transfer_query, {'hash.c': character_.hash.c})
        }
        /***
         * If criteria is > 4 of 6
         */
        if (Object.keys(transfer_query).length > 4) {
          const transferCopy = await characters_db.find(transfer_query);

          if (transferCopy && transferCopy.length) {

            /**
             * Filtered characters
             * @type {*[]}
             */
            let transferArray = [];

            /**
             * Request for every character that has been found by query
             * and check it on 404 status, if 404 - transfer has been made
             */
            for (let transferCopyElement of transferCopy) {
              await api.query(`/profile/wow/character/${transferCopyElement.realm.slug}/${transferCopyElement.name}/status`, {
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
                if (character_.hash && character_.hash.t) {
                  t_flag = true;
                }
                for (let transferArrayElement of transferArray) {
                  /** If character has T */
                  if (t_flag) {
                    /** Check for rejected T */
                    if (transferArrayElement.hash && transferArrayElement.hash.t) {
                      if (character_.hash.t === transferArrayElement.hash.t) {
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
              await detectiveCharacters(transfer_character, character_)
              transfer_character.deleteOne();
            }
          } else {
            /**
             * If transfer has been made rename, then
             * search via shadow_query
             */
            let shadow_query = {
              'realm.slug': { $ne: character_.realm.slug },
              name: { $ne: character_.name },
              character_class: character_.character_class,
              level: character_.level,
            };
            if (character_.hash.a) {
              Object.assign(shadow_query, {'hash.a': character_.hash.a})
            }
            if (character_.hash.c) {
              Object.assign(shadow_query, {'hash.c': character_.hash.c})
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

                /**
                 * Filtered characters
                 * @type {*[]}
                 */
                let shadowArray = [];

                /**
                 * Request for every character that has been found by query
                 * and check it on 404 status, if 404 - transfer has been made
                 */
                for (let shadowCopyElement of shadowCopy) {
                  await api.query(`/profile/wow/character/${shadowCopyElement.realm.slug}/${shadowCopyElement.name}/status`, {
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
                    if (character_.hash && character_.hash.t) {
                      t_flag = true;
                    }
                    for (let shadowArrayElement of shadowArray) {
                      /** If character has T */
                      if (t_flag) {
                        /** Check for rejected T */
                        if (shadowArrayElement.hash && shadowArrayElement.hash.t) {
                          if (character_.hash.t === shadowArrayElement.hash.t) {
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
                  await detectiveCharacters(transfer_character, character_)
                  transfer_character.deleteOne();
                }
              }
            }
          }
        }
      }
    } else {
      await detectiveCharacters(character_Old, character_)
    }

    console.log(character_)
    //await character_.save();
    console.info(`U:${character_.name}@${character_.realm.name}#${character_.id}:${character_.statusCode}`);
  } catch (error) {
    console.error(`E,${error}`);
  }
}

getCharacter({name: 'инициатива', realm: {slug: 'gordunni'}, updatedBy: 'test'}, 'EU75m4fVDzgpfZQQvbnL2FqzyJq5M3AliT', false, false)

module.exports = getCharacter;
