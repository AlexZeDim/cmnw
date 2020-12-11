/**
 * Model importing
 */
const characters_db = require('../../db/models/characters_db');

const BlizzAPI = require('blizzapi');
const { toSlug } = require('../../db/setters');
const detectiveCharacters = require('./detective_characters');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function shadowCharacter ({ id, name, realm, character_class, level, token, ...args }) {
  try {
    if (!id || !realm.slug || !character_class) return

    const api = new BlizzAPI({
      region: 'eu',
      clientId: clientId,
      clientSecret: clientSecret,
      accessToken: token
    });
    /**
     * If we found character with the duplicate id within the realm
     * consider it as a rename character, then delete old copy
     * Else, setting confidence and flag
     * and start detecting for realm transfer
     */
    const character_renamed = await characters_db.findOne({
      'realm.slug': realm.slug,
      id: id,
      character_class: character_class,
    }).lean();

    const transfer_character = {
      hash_exists: false,
      transfer_flag: false,
      title_flag: false,
      confidence: 0,
      candidate: {},
      transfer_query: {
        'realm.slug': { "$ne": realm.slug },
        name: name,
        character_class: character_class,
        level: level,
      },
      shadow_query: {
        'realm.slug': { $ne: realm.slug },
        name: { $ne: name },
        character_class: character_class,
        level: level,
      }
    }

    /**
     * Looking for transfer without rename
     * by hash A and hash B
     */

    if (args.hash) {
      if (args.hash.a) {
        transfer_character.hash_exists = true;
        Object.assign(transfer_character.transfer_query, { 'hash.a': args.hash.a })
        Object.assign(transfer_character.shadow_query, { 'hash.a': args.hash.a })
      }
      if (args.hash.b) {
        transfer_character.hash_exists = true;
        Object.assign(transfer_character.transfer_query, { 'hash.b': args.hash.b })
        Object.assign(transfer_character.shadow_query, { 'hash.b': args.hash.b })
      }
      if (args.hash.t) transfer_character.title_flag = true;
    }

    if (character_renamed) {
      const character = {
        name: name,
        realm: realm,
        character_class: character_class,
        level: level,
      }
      await detectiveCharacters(character_renamed, { ...character, ...args })
      await characters_db.deleteOne({ _id: character_renamed._id });
    } else {
      /**
       * Search for transfer only if criteria has at least one hash
       */
      if (transfer_character.hash_exists) {
        const character_predict_transfer = await characters_db.find(transfer_character.transfer_query).lean();
        if (character_predict_transfer && character_predict_transfer.length) {
          const characters_transferred = [];
          /**
           * Request for every character that has been found by query
           * and check it on 404 status, if 404 - transfer has been made
           */
          for (const character_predict of character_predict_transfer) {
            await api.query(`/profile/wow/character/${character_predict.realm.slug}/${toSlug(character_predict.name)}/status`, {
              timeout: 10000,
              params: { locale: 'en_GB' },
              headers: { 'Battlenet-Namespace': 'profile-eu' }
            })
              .then(res => {
                if (res && 'is_valid' in res) {
                  if (res.is_valid === false) {
                    characters_transferred.push(character_predict)
                  }
                }
              })
              .catch(() => characters_transferred.push(character_predict));
          }

          transfer_character.confidence = 1 / characters_transferred.length;

          if (characters_transferred.length === 1) {
            transfer_character.transfer_flag = true;
            transfer_character.candidate = characters_transferred[0]
          }
          if (characters_transferred.length > 1) {
            for (const character_transfer of characters_transferred) {
              /** If character has title */
              if (transfer_character.title_flag) {
                if (character_transfer.hash && character_transfer.hash.t) {
                  if (args.hash.t === character_transfer.hash.t) {
                    transfer_character.transfer_flag = true
                    transfer_character.candidate = character_transfer
                    break
                  }
                }
              } else {
                /** If character has no title and rejected character has no title also */
                if (character_transfer.hash && !character_transfer.hash.t) {
                  transfer_character.transfer_flag = true
                  transfer_character.candidate = character_transfer
                  break
                }
              }
            }
          }
          /**
           * if else, we can't detect it
           *
           * if transfer flag === true
           * */
          if (transfer_character.transfer_flag) {
            await detectiveCharacters(transfer_character, {
              ...{
                name: name,
                realm: realm,
                character_class: character_class
              },
              ...args
            })
            await characters_db.deleteOne({ _id: transfer_character._id });
          }
        } else {
          /**
           * If transfer has been made rename, then
           * search via shadow_query
           */
          if (transfer_character.hash_exists) {
            const character_shadows = await characters_db.find(transfer_character.shadow_query).lean();
            /**
             * If we found shadowCopy characters with have the same
             * hashed, level, statusCode and class
             */
            if (character_shadows && character_shadows.length) {
              const predicted_shadows = [];
              /**
               * Request for every character that has been found by query
               * and check it on 404 status, if 404 - transfer has been made
               */
              for (const character_shadow of character_shadows) {
                await api.query(`/profile/wow/character/${character_shadow.realm.slug}/${toSlug(character_shadow.name)}/status`, {
                  timeout: 10000,
                  params: { locale: 'en_GB' },
                  headers: { 'Battlenet-Namespace': 'profile-eu' }
                })
                  .then(res => {
                    if (res && 'is_valid' in res) {
                      if (res.is_valid === false) {
                        predicted_shadows.push(character_shadow)
                      }
                    }
                  })
                  .catch(() => predicted_shadows.push(character_shadow));
              }

              transfer_character.confidence = 1 / character_shadows.length;

              if (predicted_shadows.length === 1) {
                transfer_character.transfer_flag = true;
                transfer_character.candidate = predicted_shadows[0]
              }

              if (predicted_shadows.length > 1) {
                for (const character_shadow of predicted_shadows) {
                  /** If character has title */
                  if (transfer_character.title_flag) {
                    if (character_shadow.hash && character_shadow.hash.t) {
                      if (args.hash.t === character_shadow.hash.t) {
                        transfer_character.transfer_flag = true
                        transfer_character.candidate = character_shadow
                        break
                      }
                    }
                  } else {
                    /** If character has no title and rejected character has no title also */
                    if (character_shadow.hash && !character_shadow.hash.t) {
                      transfer_character.transfer_flag = true
                      transfer_character.candidate = character_shadow
                      break
                    }
                  }
                }
              }

              /**
               * if else, we can't detect it
               *
               * if transfer flag === true
               * */
              if (transfer_character.transfer_flag) {
                await detectiveCharacters(transfer_character, {
                  ...{
                    name: name,
                    realm: realm,
                    character_class: character_class
                  },
                  ...args
                })
                await characters_db.deleteOne({ _id: transfer_character._id });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(e)
  }
}

module.exports = shadowCharacter
