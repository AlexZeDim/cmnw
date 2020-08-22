/**
 * Model importing
 */

const characters_db = require('../db/characters_db');
const realms_db = require('../db/realms_db');
const osint_logs_db = require('../db/osint_logs_db');

/**
 * Modules
 */

const crc32 = require('fast-crc32c');
const battleNetWrapper = require('battlenet-api-wrapper');
const { toSlug, fromSlug } = require('../db/setters');
const indexDetective = require('./indexing/indexDetective');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 * Request characters from Blizzard API and add it to OSINT-DB (guilds)
 * @param realmSlug
 * @param characterName
 * @param characterObject
 * @param token
 * @param updatedBy
 * @param guildRank
 */

async function getCharacter(
  realmSlug,
  characterName,
  characterObject = {},
  token = '',
  updatedBy = 'OSINT-getCharacter',
  guildRank = false,
) {
  try {
    /**
     * Convert to Slug
     */
    realmSlug = toSlug(realmSlug);
    characterName = toSlug(characterName);

    /**
     * B.net wrapper
     */
    const bnw = new battleNetWrapper();
    await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');

    /**
     * Check if character exists
     */
    let character = await characters_db.findById(
      `${characterName}@${realmSlug}`,
    );

    const [
      characterData,
      characterPets,
      characterMount,
      characterMedia,
    ] = await Promise.allSettled([
      bnw.WowProfileData.getCharacterSummary(realmSlug, characterName),
      bnw.WowProfileData.getCharacterPetsCollection(realmSlug, characterName),
      bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName),
      bnw.WowProfileData.getCharacterMedia(realmSlug, characterName),
    ]);

    if (character) {
      if (characterData.value) {
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

    /**
     * Character Data
     */

    if (characterData.value) {
      character.id = characterData.value.id;
      character.name = characterData.value.name;
      character.faction = characterData.value.faction.name;
      character.gender = characterData.value.gender.name;
      character.race = characterData.value.race.name;
      character.character_class = characterData.value.character_class.name;
      character.level = characterData.value.level;
      character.statusCode = characterData.value.statusCode;

      /**
       * Timestamp
       */
      if ('last_login_timestamp' in characterData.value) {
        character.lastModified = new Date(
          characterData.value.last_login_timestamp,
        );
      }

      /**
       * Realm
       * Sometimes Blizzard return null values
       */

      if (characterData.value.realm.name === null) {
        /**
         * Find realm from slug is it's not provided
         */
        let realm = await realms_db
          .findOne({
            $or: [{ slug: realmSlug }, { slug_locale: realmSlug }],
          })
          .lean();
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
      if (
        'average_item_level' in characterData.value &&
        'equipped_item_level' in characterData.value
      ) {
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
          const { members } = await bnw.WowProfileData.getGuildRoster(
            characterData.value.realm.slug,
            toSlug(characterData.value.guild.name),
          );
          const { rank } = members.find(
            ({ character }) => character.id === characterData.value.id,
          );
          character.guild.rank = rank;
        }
      } else {
        character.guild = undefined;
      }
    } else {
      character.name = fromSlug(characterName);
      /**
       * Find realm from slug is it's not provided
       */
      let realm = await realms_db
        .findOne({
          $or: [{ slug: realmSlug }, { slug_locale: realmSlug }],
        })
        .lean();
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
       * Status Code, received, but no updated
       */
      character.statusCode = 400;
    }

    /**
     * Character Pets
     * Hash A & Hash C
     */
    if (characterPets.value) {
      let pets_array = [];
      let active_pets = [];

      let { pets } = characterPets.value;

      if (pets && pets.length) {
        for (let pet of pets) {
          if ('is_active' in pet) {
            if ('name' in pet) {
              active_pets.push(`${pet.name}`);
            }
            active_pets.push(pet.species.name);
            pets_array.push(pet.level);
          }
          if ('name' in pet) {
            pets_array.push(`${pet.name}`);
          }
          pets_array.push(pet.species.name);
          pets_array.push(pet.level);
        }
        if (active_pets.length) {
          character.hash.c = crc32
            .calculate(Buffer.from(active_pets.toString()))
            .toString(16);
        }
        character.hash.a = crc32
          .calculate(Buffer.from(pets_array.toString()))
          .toString(16);
      }
    }

    /**
     * Character Mounts
     * Hash B
     */

    if (characterMount.value) {
      let mount_array = [];

      let { mounts } = characterMount.value;

      if (mounts && mounts.length) {
        for (let mount of mounts) {
          mount_array.push(mount.id);
        }
        character.hash.b = crc32
          .calculate(Buffer.from(mount_array.toString()))
          .toString(16);
      }
    }

    /**
     * Character Media
     * ID
     */
    if (characterMedia.value) {
      if (!character.id) {
        character.id = parseInt(
          characterMedia.value.avatar_url
            .toString()
            .split('/')
            .pop(-1)
            .match(/([0-9]+)/g)[0],
        );
      }
      character.media = {
        avatar_url: characterMedia.value.avatar_url,
        bust_url: characterMedia.value.bust_url,
        render_url: characterMedia.value.render_url,
      };
    }

    /**
     * Hash.ex
     */
    if (character.id && character.character_class) {
      let hash_ex = [character.id, character.character_class];
      character.hash.ex = crc32
        .calculate(Buffer.from(hash_ex.toString()))
        .toString(16);
    }

    /**
     * Check ShadowCopy
     */
    if (character.isNew) {
      let shadowCopy, renamedCopy, transferCopy;

      /**
       * If we found rename and anything else
       */
      renamedCopy = await characters_db.findOne({
        'realm.slug': realmSlug,
        id: character.id,
        character_class: character.character_class,
      });
      if (renamedCopy) {
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
        /**
         * Transfer without rename
         * allows us to find yourself in past
         */
        let transfer_query = {
          'realm.slug': { $ne: realmSlug },
          name: character.name,
          character_class: character.character_class,
          level: character.level,
          statusCode: 200,
        };
        if (character.hash.a && character.hash.c) {
          transfer_query['hash.a'] = character.hash.a;
          transfer_query['hash.c'] = character.hash.c;
        }
        if (character.hash.b) {
          transfer_query['hash.b'] = character.hash.b;
        }
        /***
         * If criteria is >6 i.e. 7
         */
        if (Object.keys(transfer_query).length > 6) {
          transferCopy = await characters_db.find(transfer_query);
        }
        /**
         * If we found character(s) with exactly the
         * same name and hash on other realm
         */
        if (transferCopy && transferCopy.length) {
          for (let transfer_character of transferCopy) {
            /**
             * Request for every character that has been found by query
             * and check it on 404 status, if 404 - transfer has been made
             * @type {Object}
             */
            const transfer_ex = await bnw.WowProfileData.getCharacterStatus(
              transfer_character.realm.slug,
              transfer_character.name,
            );

            if (!transfer_ex) {
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
          }
        } else {
          /**
           * If transfer has been made rename, then
           * search via shadow_query
           */
          let shadow_query = {
            'realm.slug': { $ne: realmSlug },
            name: { $ne: character.name },
            character_class: character.character_class,
            level: character.level,
            statusCode: 200,
          };
          if (character.hash.a && character.hash.c) {
            shadow_query['hash.a'] = character.hash.a;
            shadow_query['hash.c'] = character.hash.c;
          }
          if (character.hash.b) {
            shadow_query['hash.b'] = character.hash.b;
          }
          /***
           * If criteria is >7 i.e. 8
           */
          if (Object.keys(shadow_query).length > 7) {
            shadowCopy = await characters_db.find(shadow_query);
          }
          /**
           * If we found shadowCopy characters with have the same
           * hashed, level, statusCode and class
           */
          if (shadowCopy && shadowCopy.length) {
            for (let shadow_character of shadowCopy) {
              /**
               * Request for every character that has been found by query
               * and check it on 404 status, if 404 - transfer has been made
               * @type {Object}
               */
              const transfer_ex = await bnw.WowProfileData.getCharacterStatus(
                shadow_character.realm.slug,
                shadow_character.name,
              );

              if (!transfer_ex) {
                let renameCheck = ['name', 'race', 'gender', 'faction'];
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
                  shadow_character.name,
                  character.name,
                  'name',
                  new Date(character.lastModified),
                  new Date(renamedCopy.lastModified),
                );
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
    }
    await character.save();
    console.info(
      `U:${character.name}@${character.realm.name}#${character.id || 0}:${
        character.statusCode
      }`,
    );
  } catch (error) {
    console.error(
      `E,${getCharacter.name},${fromSlug(characterName)}@${fromSlug(
        realmSlug,
      )},${error}`,
    );
  }
}

module.exports = getCharacter;
