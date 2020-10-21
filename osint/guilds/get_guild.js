/**
 * Model importing
 */

const guild_db = require('../../db/models/guilds_db');
const realms_db = require('../../db/models/realms_db');
const characters_db = require('../../db/models/characters_db');

/**
 * Modules
 */

const BlizzAPI = require('blizzapi');
const getCharacter = require('../characters/get_character');
const detectiveGuilds = require('./detective_guilds');
const detectiveRoster = require('./detective_roster');
const { toSlug } = require('../../db/setters');
const { differenceBy } = require('lodash');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 * Request guild from Blizzard API and add it to OSINT-DB (guilds)
 * (if we found a new character from guild-members, then adding it to OSINT-DB (characters))
 * @param guild_
 * @param token
 * @param createOnlyUnique
 * @returns {Promise<*>}
 */

async function getGuild(
  guild_ = {},
  token = '',
  createOnlyUnique = true
) {
  try {
    let guildOld;

    /**
     * Check realm before start
     */
    let realm = await realms_db.findOne({ $text: { $search: guild_.realm.slug } }, { _id: 1, slug: 1, name: 1 }).lean();
    if (!realm) {
      return
    }

    const name_slug = toSlug(guild_.name);
    const _id = toSlug(`${guild_.name}@${realm.slug}`);

    /**
     * BlizzAPI
     */
    const api = new BlizzAPI({
      region: 'eu',
      clientId: clientId,
      clientSecret: clientSecret,
      accessToken: token
    });

    /**
     * Check if guild exists
     */
    let guild = await guild_db.findById(_id);
    if (guild) {
      if (createOnlyUnique) {
        console.info(`E:${guild.name}@${guild.realm.name}#${guild.id}:${createOnlyUnique}`);
        return
      }
      guildOld = { ...guild.toObject() }
      guild.statusCode = 100;
    } else {
      guild = new guild_db({
        _id: _id,
        realm: realm,
        members: [],
        id: Date.now(),
        statusCode: 100,
        createdBy: 'OSINT-getGuild',
        updatedBy: 'OSINT-getGuild',
      })
    }

    /**
     * Request Data for Guild
     */
    const [guildData, guildRoster] = await Promise.allSettled([
      api.query(`/data/wow/guild/${realm.slug}/${name_slug}`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      }),
      api.query(`/data/wow/guild/${realm.slug}/${name_slug}/roster`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      }),
    ]);

    if (guildData && guildData.value) {

      if (Object.keys(guildData.value).length) {
        const fields = ['id', 'name', 'crest', 'achievement_points', 'member_count', 'created_timestamp', 'lastModified']
        for (let field of fields) {
          if (field in guildData.value) {
            if (field === 'lastModified') {
              guild[field] = new Date(guildData.value[field]);
            } else {
              guild[field] = guildData.value[field]
            }
          }
        }
      }

      guild.statusCode = 200;

      /** if Blizzard API returns realm as null */
      if (guildData.value.realm.name !== null) {
        guild.realm._id = guildData.value.realm.id
        guild.realm.name = guildData.value.realm.name
        guild.realm.slug = guildData.value.realm.slug
      }

      /** if Blizzard API returns faction as null */
      if (guildData.value.faction.name === null) {
        if (guildData.value.faction.type.toString().startsWith('A')) {
          guild.faction = 'Alliance'
        }
        if (guildData.value.faction.type.toString().startsWith('H')) {
          guild.faction = 'Horde'
        }
      } else {
        guild.faction = guildData.value.faction.name;
      }

      /**
       * ROSTER
       */
      if (
        guildRoster &&
        guildRoster.value &&
        guildRoster.value.members &&
        guildRoster.value.members.length
      ) {
        /** Playable Class table */
        const playable_class = new Map([
          [1, 'Warrior'],
          [2, 'Paladin'],
          [3, 'Hunter'],
          [4, 'Rogue'],
          [5, 'Priest'],
          [6, 'Death Knight'],
          [7, 'Shaman'],
          [8, 'Mage'],
          [9, 'Warlock'],
          [10, 'Monk'],
          [11, 'Druid'],
          [12, 'Demon Hunter'],
        ]);

        /** New Guild Roster */
        let updated_members = [];

        /** Convert to (Old) Roster array */
        const old_members = guildOld.members;

        /** Members loop */
        for (let member of guildRoster.value.members) {
          if (member && 'character' in member && 'rank' in member) {
            /** Is every guild member is in OSINT-DB? */
            let character = await characters_db.findById(toSlug(`${member.character.name}@${guild.realm.slug}`));

            /** guild_member object for array.push */
            let guild_member = {
              _id: `${member.character.name}@${guild.realm.slug}`,
              id: parseInt(member.character.id),
              rank: parseInt(member.rank),
            };
            /** Check if data from guild roster > current character */
            if (character) {
              let guildExist = false;

              if (character.guild) {
                /**
                 * Is character guild is the same
                 * as requested guild we update rank
                 */
                if (character.guild.name === guild.name) {
                  character.guild.rank = member.rank;
                } else {
                  guildExist = true;
                }
              }

              /**
               * If guild endpoint somehow up-to-date then character's
               */
              let g_lastModified = new Date(guildData.value.lastModified);
              let c_lastModified = new Date(character.lastModified);
              if (guildExist && c_lastModified < g_lastModified) {
                character.guild = {
                  id: guild.id,
                  name: guild.name,
                  slug: name_slug,
                  rank: member.rank,
                };
              }

              character.lastModified = new Date(guildData.value.lastModified);

              character.save();
            } else {
              /**
               * If new name in OSINT then
               * find class and let
               * getCharacter F() handle it
               */
              let character_Object = {
                id: member.character.id,
                name: member.character.name,
                realm: {
                  _id: guild.realm.id,
                  name: guild.realm.name,
                  slug: guild.realm.slug,
                },
                guild: {
                  _id: guild.id,
                  name: guild.name,
                  slug: name_slug,
                  rank: member.rank,
                },
                faction: guildData.value.faction.name,
                level: member.character.level,
                lastModified: new Date(guildData.value.lastModified),
                createdAt: guild.updatedBy,
                updatedBy: guild.updatedBy
              };
              if (member.character.hasOwnProperty('playable_class')) {
                Object.assign(character_Object, { character_class: playable_class.get(member.character.playable_class.id) });
              }
              await getCharacter(
                character_Object,
                token,
                false,
                false
              );
            }

            /**
             * If compare rosters
             */
            if (old_members && old_members.length) {
              /**
               * It's GM, check the older one
               */
              if (parseInt(member.rank) === 0) {
                /** Find old GM */
                let gm_old = old_members.find(m => parseInt(m.rank) === 0);

                /** Transfer of power has been made */
                if (gm_old.id !== guild_member.id) {
                  const [nameO, realmO] = gm_old._id.split('@');
                  const [nameN, realmN] = guild_member._id.split('@');
                  /** Request force update for hash comparison */
                  await Promise.all([
                    await getCharacter(
                      { name: nameO, realm: { slug: realmO }, createdBy: guild.updatedBy, updatedBy: guild.updatedBy },
                      token,
                      false,
                      false
                    ),
                    await getCharacter(
                      { name: nameN, realm: { slug: realmN }, createdBy: guild.updatedBy, updatedBy: guild.updatedBy },
                      token,
                      false,
                      false
                    ),
                  ]);
                  /** Receive both characters */
                  const [
                    character_gm_old,
                    character_gm_new,
                  ] = await Promise.all([
                    await characters_db.findOne({
                      'id': gm_old.id,
                      'realm.slug': guildData.value.realm.slug,
                    }),
                    await characters_db.findOne({
                      'id': guild_member.id,
                      'realm.slug': guildData.value.realm.slug,
                    }),
                  ]);
                  /** Make sure that both exists */
                  if (character_gm_old && character_gm_new) {
                    /** And both have hash values to check */
                    let ownership_flag = false;
                    if (character_gm_old.hash.c && character_gm_new.hash.c) {
                      if (
                        character_gm_old.hash.c === character_gm_new.hash.c
                      ) {
                        /** Transfer title */
                        detectiveRoster(
                          character_gm_new._id,
                          'character',
                          `${character_gm_old._id}#${guild._id}`,
                          `${character_gm_new._id}#${guild._id}`,
                          'title',
                          new Date(guildData.value.lastModified),
                          new Date(guild.lastModified),
                        );
                        detectiveRoster(
                          character_gm_old._id,
                          'character',
                          `${character_gm_old._id}#${guild._id}`,
                          `${character_gm_new._id}#${guild._id}`,
                          'title',
                          new Date(guildData.value.lastModified),
                          new Date(guild.lastModified),
                        );
                        detectiveRoster(
                          `${guild._id}`,
                          'guild',
                          `${character_gm_old._id}`,
                          `${character_gm_new._id}`,
                          'title',
                          new Date(guildData.value.lastModified),
                          new Date(guild.lastModified),
                        );
                      } else {
                        ownership_flag = true;
                      }
                    } else {
                      ownership_flag = true;
                    }
                    /** Transfer ownership */
                    if (ownership_flag) {
                      detectiveRoster(
                        character_gm_new._id,
                        'character',
                        `${character_gm_old._id}#${guild._id}`,
                        `${character_gm_new._id}#${guild._id}`,
                        'ownership',
                        new Date(guildData.value.lastModified),
                        new Date(guild.lastModified),
                      );
                      detectiveRoster(
                        character_gm_old._id,
                        'character',
                        `${character_gm_old._id}#${guild._id}`,
                        `${character_gm_new._id}#${guild._id}`,
                        'ownership',
                        new Date(guildData.value.lastModified),
                        new Date(guild.lastModified),
                      );
                      detectiveRoster(
                        `${guild._id}`,
                        'guild',
                        `${character_gm_old._id}`,
                        `${character_gm_new._id}`,
                        'ownership',
                        new Date(guildData.value.lastModified),
                        new Date(guild.lastModified),
                      );
                    }
                  }
                }
              }

              /**
               * If new member was found in old
               * check for rank change
               */
              if (old_members.some(({ id }) => id === guild_member.id)) {
                let guild_member_old = old_members.find(
                  ({ id }) => id === guild_member.id,
                );
                /**
                 * Demote
                 */
                if (guild_member.rank > guild_member_old.rank) {
                  detectiveRoster(
                    guild_member._id,
                    'character',
                    `${guild._id}#${guild.id} // R:${guild_member_old.rank}`,
                    `${guild._id}#${guild.id} // R:${guild_member.rank}`,
                    'demote',
                    new Date(guildData.value.lastModified),
                    new Date(guild.lastModified),
                  );
                  detectiveRoster(
                    `${guild._id}`,
                    'guild',
                    `${guild_member._id} // R:${guild_member_old.rank}`,
                    `${guild_member._id} // R:${guild_member.rank}`,
                    'demote',
                    new Date(guildData.value.lastModified),
                    new Date(guild.lastModified),
                  );
                }
                /**
                 * Promote
                 */
                if (guild_member.rank < guild_member_old.rank) {
                  detectiveRoster(
                    guild_member._id,
                    'character',
                    `${guild._id}#${guild.id} // R:${guild_member_old.rank}`,
                    `${guild._id}#${guild.id} // R:${guild_member.rank}`,
                    'promote',
                    new Date(guildData.value.lastModified),
                    new Date(guild.lastModified),
                  );
                  detectiveRoster(
                    `${guild._id}`,
                    'guild',
                    `${guild_member._id} // R:${guild_member_old.rank}`,
                    `${guild_member._id} // R:${guild_member.rank}`,
                    'promote',
                    new Date(guildData.value.lastModified),
                    new Date(guild.lastModified),
                  );
                }
              } else {
                /**
                 * If member not in a old members
                 * then JOINS
                 */
                detectiveRoster(
                  guild_member._id,
                  'character',
                  ``,
                  `${guild._id}#${guild.id} // R:${guild_member.rank}`,
                  'join',
                  new Date(guildData.value.lastModified),
                  new Date(guild.lastModified),
                );
                detectiveRoster(
                  `${guild._id}`,
                  'guild',
                  ``,
                  `${guild_member._id} // R:${guild_member.rank}`,
                  'join',
                  new Date(guildData.value.lastModified),
                  new Date(guild.lastModified),
                );
              }
            }
            /** Push to guild.members */
            updated_members.push(guild_member);
          }
        }
        /** End of Members loop */

        /**
         * If old member not in a new_roster
         * then LEAVE
         */
        const leaves = differenceBy(old_members, updated_members, 'id');

        if (leaves && leaves.length) {
          for (let character_left of leaves) {
            detectiveRoster(
              character_left._id,
              'character',
              `${guild._id}#${guild.id} // R:${character_left.rank}`,
              ``,
              'leave',
              new Date(guildData.value.lastModified),
              new Date(guild.lastModified),
            );
            detectiveRoster(
              `${guild._id}`,
              'guild',
              `${character_left._id} // R:${character_left.rank}`,
              ``,
              'leave',
              new Date(guildData.value.lastModified),
              new Date(guild.lastModified),
            );
          }
        }
        /** Update old guild roster with a new roster */
        guild.members = updated_members;
      }

      /** If guild new, check rename version of it */
      if (guild.isNew) {
        /** Check was guild renamed */
        const renamedGuild = await guild_db.findOne({
          'id': guild.id,
          'realm.slug': guild.realm.slug,
        });
        if (renamedGuild) {
          await detectiveGuilds(renamedGuild, guild)
        }
      } else {
        await detectiveGuilds(guildOld, guild)
      }

      guild.save();
      console.info(`U:${guild.name}@${guild.realm.name}#${guild.id}:${guild.statusCode}`);
    }
  } catch (error) {
    console.error(`E,${getGuild.name},${guild_.name}@${guild_.realm.slug},${error}`);
  }
}

module.exports = getGuild;
