/**
 * Model importing
 */
const characters_db = require('../../db/models/characters_db');
const realms_db = require('../../db/models/realms_db');
const osint_logs_db = require('../../db/models/osint_logs_db');

/**
 * Modules
 */

const crc32 = require('fast-crc32c');
const BlizzAPI = require('blizzapi');
const { toSlug, fromSlug } = require('../../db/setters');
const indexDetective = require('../indexing/indexDetective');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 * Request characters from Blizzard API and add it to OSINT-DB (guilds)
 * @param realmSlug {String} - realm slug
 * @param characterName {String} - character name
 * @param characterObject {Object} - provides any additional data for requested character
 * @param token {String} - provide a battle.net token
 * @param updatedBy {String} - fingerprinting function name for create and update operations
 * @param guildRank {Boolean} - if this value true, we will request guild roster to check guild rank of this character
 * @param createOnlyUnique {Boolean} - if value is true, we create characters only that doesn't exist. Ignore update dont update them.
 */

async function get_character(
  realmSlug,
  characterName,
  characterObject = {},
  token = '',
  updatedBy = 'OSINT-get_character',
  guildRank = false,
  createOnlyUnique = false,
) {
  try {
    let characterData, characterPets, characterMount, characterMedia

    realmSlug = toSlug(realmSlug);
    characterName = toSlug(characterName);

    /** Check realm */
    if (!createOnlyUnique) {
      let realm = await realms_db.findOne({ $text: { $search: realmSlug } }).lean();
      if (realm && realm.slug) {
        realmSlug = realm.slug
      }
      if (!realm) {
        console.info(`E:${characterName}@${realmSlug} not found`);
        return void 0
      }
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

    const character_status = await api.query(`/profile/wow/character/${realmSlug}/${characterName}/status`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    }).catch(() => {return void 0})

    if (character_status) {
      ([characterData, characterPets, characterMount, characterMedia] = await Promise.allSettled([
        api.query(`/profile/wow/character/${realmSlug}/${characterName}`, {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${realmSlug}/${characterName}/collections/pets`, {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${realmSlug}/${characterName}/collections/mounts`, {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        }),
        api.query(`/profile/wow/character/${realmSlug}/${characterName}/character-media`, {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        })
      ]));
    }

    /** Check if character exists */
    let character = await characters_db.findById(`${characterName}@${realmSlug}`);

    /** If character exists and createOnlyUnique initiated, then return */
    if (character && createOnlyUnique) {
      console.info(`E:${character.name}@${character.realm.name}#${character.id || 0}:${character.statusCode}`);
      return void 0
    }

    /** If character exists and */
    if (character) {
      if (characterData && characterData.value) {
        let detectiveCheck = ['race', 'gender', 'faction'];
        for (let check of detectiveCheck) {
          if (check in character) {
            indexDetective(
              character._id,
              'character',
              character[check],
              characterData.value[check].name,
              check,
              new Date(characterData.value.last_login_timestamp),
              new Date(character.lastModified),
            );
          }
        }
      }
    } else {
      character = new characters_db({
        _id: `${characterName}@${realmSlug}`,
        id: Date.now(),
        statusCode: 100,
        createdBy: updatedBy,
        updatedBy: updatedBy,
        isWatched: false,
      });
    }

    if (character_status) {
      character.id = character_status.id
    }

    /**
     * Character Data
     */

    if (characterData && characterData.value) {
      character.id = characterData.value.id;
      character.name = characterData.value.name;
      character.faction = characterData.value.faction.name;
      character.gender = characterData.value.gender.name;
      character.race = characterData.value.race.name;
      character.character_class = characterData.value.character_class.name;
      character.level = characterData.value.level;
      character.statusCode = 200;

      /**
       * Timestamp
       */
      if ('last_login_timestamp' in characterData.value) {
        character.lastModified = new Date(characterData.value.last_login_timestamp);
      }

      /**
       * Realm
       * Sometimes Blizzard return null values
       */

      if (characterData.value.realm.name === null) {
        /**
         * Find realm from slug is it's not provided
         */
        let realm = await realms_db.findOne({ $text: { $search: realmSlug } });
        /**
         * If realm exists, add it
         */
        if (realm) {
          character.realm = {
            id: realm.id,
            name: realm.name,
            slug: realm.slug,
          };
        }
      } else {
        character.realm = {
          id: characterData.value.realm.id,
          name: characterData.value.realm.name,
          slug: characterData.value.realm.slug,
        };
      }

      /**
       * Active spec
       */
      if ('active_spec' in characterData.value) {
        character.spec = characterData.value.active_spec.name;
      }

      /**
       * Item Level
       */
      if ('average_item_level' in characterData.value && 'equipped_item_level' in characterData.value) {
        character.ilvl = {
          eq: characterData.value.average_item_level,
          avg: characterData.value.equipped_item_level,
        };
      }

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
       * Guild
       */
      if (characterData.value.guild) {
        character.guild.id = characterData.value.guild.id;
        character.guild.name = characterData.value.guild.name;
        character.guild.slug = characterData.value.guild.name;
        if (guildRank === true) {
          await api.query(`data/wow/guild/${characterData.value.realm.slug}/${toSlug(characterData.value.guild.name)}/roster`, {
            timeout: 10000,
            params: { locale: 'en_GB' },
            headers: { 'Battlenet-Namespace': 'profile-eu' }
          })
            .then (({members}) => {
              const { rank } = members.find(({ character }) => character.id === characterData.value.id);
              character.guild.rank = rank;
            })
            .catch(e => e);
        }
      } else {
        character.guild = undefined;
      }
    } else {
      character.name = fromSlug(characterName);
      /**
       * Find realm from slug is it's not provided
       */
      let realm = await realms_db.findOne({ $text: { $search: realmSlug } });
      /**
       * If realm exists, add it
       */
      if (realm) {
        character.realm = {
          id: realm.id,
          name: realm.name,
          slug: realm.slug,
        };
      }
      /**
       * Upload other fields from imported values
       */
      if (characterObject && Object.keys(characterObject).length) {
        let character_fields = [
          'id',
          'guild',
          'faction',
          'character_class',
          'level',
          'lastModified',
        ];
        for (let field of character_fields) {
          if (field in characterObject) {
            character[field] = characterObject[field];
          }
        }
      }
      /**
       * Status Code, received, but not updated
       */
      character.statusCode = 400;
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

      }
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

    /**
     * Hash.ex
     */
    if (character.id && character.character_class) {
      let hash_ex = [character.id, character.character_class];
      character.hash.ex = crc32.calculate(Buffer.from(hash_ex.toString())).toString(16);
    }

    /**
     * Check ShadowCopy
     */
    if (character.isNew) {
      let shadowCopy, renamedCopy, transferCopy;

      /**
       * If we found rename within one realm and anything else
       */
      renamedCopy = await characters_db.findOne({
        'realm.slug': realmSlug,
        id: character.id,
        character_class: character.character_class,
      });
      if (renamedCopy) {
        /** Check any other changes */
        let renameCheck = ['race', 'gender', 'faction'];
        for (let check of renameCheck) {
          if (check in character && check in renamedCopy) {
            indexDetective(
              character._id,
              'character',
              renamedCopy[check],
              character[check],
              check,
              new Date(character.lastModified),
              new Date(renamedCopy.lastModified),
            );
          }
        }
        /** Name change */
        indexDetective(
          character._id,
          'character',
          renamedCopy.name,
          character.name,
          'name',
          new Date(character.lastModified),
          new Date(renamedCopy.lastModified),
        );
        /** Update all osint logs */
        await osint_logs_db.updateMany(
          {
            root_id: renamedCopy._id,
          },
          {
            root_id: character._id,
            $push: { root_history: character._id },
          },
        );
        renamedCopy.deleteOne();
      }

      /**
       * Shadow copy
       */
      if (!renamedCopy) {
        /** Setting confidence and flag */
        let transfer_flag = false;
        let confidence = 0;
        let transfer_character;
        /**
         * Transfer without rename
         * allows us to find yourself in past
         */
        let transfer_query = {
          'realm.slug': { "$ne": realmSlug },
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
          transferCopy = await characters_db.find(transfer_query);
        }
        /**
         * If we found character(s) with exactly the
         * same name and hash on other realm
         */
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
            let renameCheck = ['race', 'gender', 'faction'];
            for (let check of renameCheck) {
              if (check in character && check in transfer_character) {
                indexDetective(
                  character._id,
                  'character',
                  transfer_character[check],
                  character[check],
                  check,
                  new Date(character.lastModified),
                  new Date(transfer_character.lastModified),
                );
              }
            }
            indexDetective(
              character._id,
              'character',
              transfer_character['realm'].slug,
              character['realm'].slug,
              'realm',
              new Date(character.lastModified),
              new Date(transfer_character.lastModified),
            );
            /** Update all osint logs */
            await osint_logs_db.updateMany(
              {
                root_id: transfer_character._id,
              },
              {
                root_id: character._id,
                $push: { root_history: character._id },
              },
            );
            transfer_character.deleteOne();
          }
        } else {
          /** Setting confidence and flag */
          let transfer_flag = false;
          let confidence = 0;
          let shadow_character;
          /**
           * If transfer has been made rename, then
           * search via shadow_query
           */
          let shadow_query = {
            'realm.slug': { $ne: realmSlug },
            name: { $ne: character.name },
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
          if (Object.keys(shadow_query).length > 4) {
            shadowCopy = await characters_db.find(shadow_query);
          }
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
                shadow_character = shadowArray[0]
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
                        shadow_character = shadowArrayElement
                        break
                      }
                    }
                  } else {
                    /** If character has no T and rejected character has no T also */
                    if (shadowArrayElement.hash && !shadowArrayElement.hash.t) {
                      transfer_flag = true
                      shadow_character = shadowArrayElement
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
              let renameCheck = ['race', 'gender', 'faction'];
              for (let check of renameCheck) {
                if (check in character && check in shadow_character) {
                  indexDetective(
                    character._id,
                    'character',
                    shadow_character[check],
                    character[check],
                    check,
                    new Date(character.lastModified),
                    new Date(shadow_character.lastModified),
                  );
                }
              }
              indexDetective(
                character._id,
                'character',
                shadow_character['realm'].slug,
                character['realm'].slug,
                'realm',
                new Date(character.lastModified),
                new Date(shadow_character.lastModified),
              );
              /** Update all osint logs */
              await osint_logs_db.updateMany(
                {
                  root_id: shadow_character._id,
                },
                {
                  root_id: character._id,
                  $push: { root_history: character._id },
                },
              );
              shadow_character.deleteOne();
            }
          }
        }
      }
    }
    await character.save();
    console.info(`U:${character.name}@${character.realm.name}#${character.id || 0}:${character.statusCode}`);
  } catch (error) {
    console.error(`E,${fromSlug(characterName)}@${fromSlug(realmSlug)},${error}`);
  }
}

module.exports = get_character;