/**
 * Model importing
 */
const characters_db = require('../../db/models/characters_db');

const BlizzAPI = require('blizzapi');
const { toSlug } = require('../../db/setters');
const detectiveCharacters = require('./detective_characters');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function shadowCharacter (character, token) {
  try {
    if (!character) return
    if (!character.id || !character.realm.slug || !character.character_class) return

    const api = new BlizzAPI({
      region: 'eu',
      clientId: clientId,
      clientSecret: clientSecret,
      accessToken: token
    });
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
      const transfer_query = {
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
  } catch (e) {
    console.error(e)
  }
}

module.exports = shadowCharacter
