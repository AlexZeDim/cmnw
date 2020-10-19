/**
 * Model importing
 */

const guild_db = require('../../db/models/guilds_db');
const realms_db = require('../../db/models/realms_db');
const characters_db = require('../../db/models/characters_db');
const osint_logs_db = require('../../db/models/osint_logs_db');

/**
 * Modules
 */

const BlizzAPI = require('blizzapi');
const getCharacter = require('../characters/get_character');
const detectiveGuild = require('../indexing/detective_guild');
const { toSlug } = require('../../db/setters');
const { differenceBy } = require('lodash');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 * Request guild from Blizzard API and add it to OSINT-DB (guilds)
 * (if we found a new character from guild-members, then adding it to OSINT-DB (characters))
 * @param realmSlug
 * @param nameSlug
 * @param token
 * @param updatedBy
 * @returns {Promise<*>}
 */

async function getGuild(
  realmSlug,
  nameSlug,
  token = '',
  updatedBy = `OSINT-${getGuild.name}`,
) {
  try {
    /**
     * Convert to Slug
     */
    realmSlug = toSlug(realmSlug);
    nameSlug = toSlug(nameSlug);

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
     * Check if character exists
     */
    let guild = await guild_db.findById(`${nameSlug}@${realmSlug}`);

    /**
     * Request Data for Guild
     */
    const [guildData, guildRoster] = await Promise.allSettled([
      api.query(`/data/wow/guild/${realmSlug}/${nameSlug}`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      }),
      api.query(`/data/wow/guild/${realmSlug}/${nameSlug}/roster`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      }),
    ]);

    if (guildData && guildData.value) {
      /** Blizzard API return realm as null somehow */
      if (guildData.value.realm.name === null) {
        let realm = await realms_db.findOne({ $text: { $search: realmSlug } }).lean();
        if (realm) {
          guildData.value.realm = {
            id: realm._id,
            name: realm.name,
            slug: realm.slug
          }
        }
        if (!realm) {
          console.info(`E:${nameSlug}@${realmSlug} not found`);
          return void 0
        }
      }
      if (guildData.value.faction.name === null) {
        if (guildData.value.faction.type.toString().startsWith('A')) {
          guildData.value.faction.name = 'Alliance'
        }
        if (guildData.value.faction.type.toString().startsWith('H')) {
          guildData.value.faction.name = 'Horde'
        }
      }
    }

    if (guild) {
      if (guildData && guildData.value) {
        detectiveGuild(
          guild._id,
          'guild',
          guild.faction,
          guildData.value.faction.name,
          'faction',
          new Date(guildData.value.lastModified),
          new Date(guild.lastModified),
        );
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
          let new_guild_roster = [];

          /** Convert to (Old) Roster array */
          let members = guild.get('members', Array);

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
                    slug: nameSlug,
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
                    id: guild.realm.id,
                    name: guild.realm.name,
                    slug: guild.realm.slug,
                  },
                  guild: {
                    id: guild.id,
                    name: guild.name,
                    slug: nameSlug,
                    rank: member.rank,
                  },
                  faction: guildData.value.faction.name,
                  level: member.character.level,
                  lastModified: new Date(guildData.value.lastModified),
                  createdAt: updatedBy,
                  updatedBy: updatedBy
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
               * If members list exists in exists guild
               */
              if (members && members.length) {
                /**
                 * It's GM, check the older one
                 */
                if (parseInt(member.rank) === 0) {
                  /** Find old GM */
                  let gm_old = members.find(m => parseInt(m.rank) === 0);

                  /** Transfer of power has been made */
                  if (gm_old.id !== guild_member.id) {
                    const [nameO, realmO] = gm_old._id.split('@');
                    const [nameN, realmN] = guild_member._id.split('@');
                    /** Request force update for hash comparison */
                    await Promise.all([
                      await getCharacter(
                        { name: nameO, realm: { slug: realmO }, createdBy: updatedBy, updatedBy: updatedBy },
                        token,
                        false,
                        false
                      ),
                      await getCharacter(
                        { name: nameN, realm: { slug: realmN }, createdBy: updatedBy, updatedBy: updatedBy },
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
                          detectiveGuild(
                            character_gm_new._id,
                            'character',
                            `${character_gm_old._id}#${guild._id}`,
                            `${character_gm_new._id}#${guild._id}`,
                            'title',
                            new Date(guildData.value.lastModified),
                            new Date(guild.lastModified),
                          );
                          detectiveGuild(
                            character_gm_old._id,
                            'character',
                            `${character_gm_old._id}#${guild._id}`,
                            `${character_gm_new._id}#${guild._id}`,
                            'title',
                            new Date(guildData.value.lastModified),
                            new Date(guild.lastModified),
                          );
                          detectiveGuild(
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
                        detectiveGuild(
                          character_gm_new._id,
                          'character',
                          `${character_gm_old._id}#${guild._id}`,
                          `${character_gm_new._id}#${guild._id}`,
                          'ownership',
                          new Date(guildData.value.lastModified),
                          new Date(guild.lastModified),
                        );
                        detectiveGuild(
                          character_gm_old._id,
                          'character',
                          `${character_gm_old._id}#${guild._id}`,
                          `${character_gm_new._id}#${guild._id}`,
                          'ownership',
                          new Date(guildData.value.lastModified),
                          new Date(guild.lastModified),
                        );
                        detectiveGuild(
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
                if (members.some(({ id }) => id === guild_member.id)) {
                  let guild_member_old = members.find(
                    ({ id }) => id === guild_member.id,
                  );
                  /**
                   * Demote
                   */
                  if (guild_member.rank > guild_member_old.rank) {
                    detectiveGuild(
                      guild_member._id,
                      'character',
                      `${guild._id}#${guild.id} // R:${guild_member_old.rank}`,
                      `${guild._id}#${guild.id} // R:${guild_member.rank}`,
                      'demote',
                      new Date(guildData.value.lastModified),
                      new Date(guild.lastModified),
                    );
                    detectiveGuild(
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
                    detectiveGuild(
                      guild_member._id,
                      'character',
                      `${guild._id}#${guild.id} // R:${guild_member_old.rank}`,
                      `${guild._id}#${guild.id} // R:${guild_member.rank}`,
                      'promote',
                      new Date(guildData.value.lastModified),
                      new Date(guild.lastModified),
                    );
                    detectiveGuild(
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
                  detectiveGuild(
                    guild_member._id,
                    'character',
                    ``,
                    `${guild._id}#${guild.id} // R:${guild_member.rank}`,
                    'join',
                    new Date(guildData.value.lastModified),
                    new Date(guild.lastModified),
                  );
                  detectiveGuild(
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
              new_guild_roster.push(guild_member);
            }
          }
          /** End of Members loop */

          /**
           * If old member not in a new_roster
           * then LEAVE
           */
          const leaves = differenceBy(members, new_guild_roster, 'id');

          if (leaves && leaves.length) {
            for (let character_left of leaves) {
              detectiveGuild(
                character_left._id,
                'character',
                `${guild._id}#${guild.id} // R:${character_left.rank}`,
                ``,
                'leave',
                new Date(guildData.value.lastModified),
                new Date(guild.lastModified),
              );
              detectiveGuild(
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
          guild.members = new_guild_roster;
        }
      }
    } else {
      guild = new guild_db({
        _id: `${nameSlug}@${realmSlug}`,
        members: [],
        statusCode: 100,
        createdBy: updatedBy,
        updatedBy: updatedBy,
        isWatched: false,
      });
    }

    if (guild.isNew) {
      if (guildData && guildData.value) {
        /** Check was guild renamed */
        let renamed_guild = await guild_db.findOne({
          'id': guildData.value.id,
          'realm.slug': guildData.value.realm.slug,
        });

        if (renamed_guild) {
          /** If yes, log rename */
          detectiveGuild(
            renamed_guild._id,
            'guild',
            renamed_guild.name,
            guildData.value.name,
            'name',
            new Date(guildData.value.lastModified),
            new Date(renamed_guild.lastModified),
          );
          /** And check faction change */
          detectiveGuild(
            renamed_guild._id,
            'guild',
            renamed_guild.faction,
            guildData.value.faction.name,
            'faction',
            new Date(guildData.value.lastModified),
            new Date(guild.lastModified),
          );

          /** Update all osint logs */
          await osint_logs_db.updateMany(
            {
              root_id: renamed_guild._id,
            },
            {
              root_id: guild._id,
              $push: { root_history: guild._id },
            },
          );
          renamed_guild.deleteOne();
        }
      }
    }

    if (guildData && guildData.value) {
      guild.id = guildData.value.id;
      guild.name = guildData.value.name;
      guild.faction = guildData.value.faction.name;
      guild.realm = {
        id: guildData.value.realm.id,
        name: guildData.value.realm.name,
        slug: guildData.value.realm.slug,
      };
      guild.crest = guildData.value.crest;
      guild.achievement_points = guildData.value.achievement_points;
      guild.member_count = guildData.value.member_count;
      guild.lastModified = new Date(guildData.value.lastModified);
      guild.created_timestamp = guildData.value.created_timestamp;
      guild.statusCode = 200;

      /** Create roster only if guild is new */
      if (
        guild.isNew &&
        guildRoster.value &&
        guildRoster.value.members &&
        guildRoster.value.members.length
      ) {
        for (let member of guildRoster.value.members) {
          if (member && 'character' in member && 'rank' in member) {
            /** guild_member object for array.push */
            let guild_member = {
              _id: `${member.character.name}@${guildData.value.realm.slug}`,
              id: parseInt(member.character.id),
              rank: parseInt(member.rank),
            };
            guild.members.push(guild_member);
          }
        }
      }
      await guild.save();
      console.info(`U:${guild.name}@${guild.realm.name}#${guild.id || 0}:${guild.statusCode}`);
    }
  } catch (error) {
    console.error(`E,${getGuild.name},${nameSlug}@${realmSlug},${error}`);
  }
}

module.exports = getGuild;
