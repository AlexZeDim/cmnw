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
 * @param name {string}
 * @param realm {Object<{ _id: number, name: string, slug: string }>}
 * @param token {string=}
 * @param createOnlyUnique {Boolean=}
 * @param forceUpdate {Boolean=}
 * @param iterations {number=}
 * @param args {Object=}
 * @returns {Promise<void>}
 */

async function getGuild (
  {
    name,
    realm,
    token,
    createOnlyUnique = false,
    iterations,
    forceUpdate = false,
    ...args
  }
) {
  try {

    const t = new Date().getTime();
    const guild_last = {};

    /**
     * Check realm before start
     */
    const realm_ = await realms_db.findOne({ $text: { $search: realm.slug } }, { _id: 1, slug: 1, name: 1 }).lean();
    if (!realm_) return

    const name_slug = toSlug(name);
    const _id = toSlug(`${name}@${realm_.slug}`);

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
        console.warn(`E:${(iterations) ? (iterations + ':') : ('')}${guild._id}:${createOnlyUnique}`);
        return
      }
      if (!forceUpdate && ((t - (12 * 60 * 60 * 1000)) < guild.updatedAt.getTime())) {
        console.warn(`E:${(iterations) ? (iterations + ':') : ('')}${guild._id}:${forceUpdate}`);
        return
      }
      Object.assign(guild_last, guild.toObject())
      guild.statusCode = 100;
      if (args.updatedBy) guild.updatedBy = args.updatedBy
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
    const [summary, roster] = await Promise.allSettled([
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

    if (summary && summary.value) {

      if (Object.keys(summary.value).length) {
        const fields = ['id', 'name', 'crest', 'achievement_points', 'member_count', 'created_timestamp']
        for (const field of fields) {
          if (field in summary.value) {
            guild[field] = summary.value[field]
          }
        }
        if (summary.value.lastModified) guild.lastModified = new Date(summary.value['lastModified'])
      }

      guild.statusCode = 200;

      /** if Blizzard API returns realm as null */
      if (summary.value.realm.name !== null) {
        guild.realm._id = summary.value.realm.id
        guild.realm.name = summary.value.realm.name
        guild.realm.slug = summary.value.realm.slug
      } else {
        guild.realm = realm_
      }

      /** if Blizzard API returns faction as null */
      if (summary.value.faction.name === null) {
        if (summary.value.faction.type.toString().startsWith('A')) guild.faction = 'Alliance'
        if (summary.value.faction.type.toString().startsWith('H')) guild.faction = 'Horde'
      } else {
        guild.faction = summary.value.faction.name;
      }

      /**
       * ROSTER
       */
      if (
        roster &&
        roster.value &&
        roster.value.members &&
        roster.value.members.length
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
        const members_updated = [];

        /** Convert to (Old) Roster array */
        const members_old = guild_last.members;

        const array = [];
        let iterations = 0

        /** Members loop */
        for (const member of roster.value.members) {
          if (member && 'character' in member && 'rank' in member) {
            /**
             * Index every character from guild roster
             * in OSINT DB
             */
            array.push(
              getCharacter({
                id: member.character.id,
                name: member.character.name,
                realm: {
                  id: guild.realm.id,
                  name: guild.realm.name,
                  slug: guild.realm.slug,
                },
                guild: {
                  _id: `${name_slug}@${guild.realm.slug}`,
                  name: guild.name,
                  slug: name_slug,
                  rank: member.rank,
                },
                character_class: ('playable_class' in member.character && playable_class.has(member.character.playable_class.id)) ? (playable_class.get(member.character.playable_class.id)) : undefined,
                faction: summary.value.faction.name,
                level: member.character.level,
                lastModified: guild.lastModified,
                updatedBy: guild.updatedBy,
                token: token,
                iterations: iterations++,
                guildRank: true,
                createOnlyUnique: true
              })
            )

            if (parseInt(member.rank) === 0 || array.length >= 10 || member.character.id === roster.value.members[roster.value.members.length - 1].character.id) {
              await Promise.allSettled(array)
              array.length = 0;
            }

            /** guild_member object for array.push */
            const guild_member = {
              _id: `${member.character.name}@${guild.realm.slug}`,
              id: parseInt(member.character.id),
              rank: parseInt(member.rank),
            };

            /**
             * If compare rosters
             */
            if (members_old && members_old.length) {
              /**
               * It's GM, check the older one
               */
              if (parseInt(member.rank) === 0) {
                /** Find old GM */
                const gm_old = members_old.find(m => parseInt(m.rank) === 0);

                /** Transfer of power has been made */
                if (gm_old.id !== guild_member.id) {
                  /** Receive both characters */
                  const [character_gm_old, character_gm_new] = await Promise.all([
                    characters_db.findOne({
                      'id': gm_old.id,
                      'realm.slug': summary.value.realm.slug,
                    }).lean().exec(),
                    characters_db.findOne({
                      'id': guild_member.id,
                      'realm.slug': summary.value.realm.slug,
                    }).lean().exec(),
                  ]);
                  /** Make sure that both exists */
                  if (character_gm_old && character_gm_new) {
                    /** And both have hash values to check */
                    if (character_gm_old.hash_a && character_gm_new.hash_a) {
                      /** Transfer title */
                      if (character_gm_old.hash_a === character_gm_new.hash_a) {
                        detectiveRoster(
                          character_gm_new._id,
                          'character',
                          `${character_gm_old._id}#${guild._id}`,
                          `${character_gm_new._id}#${guild._id}`,
                          'title',
                          new Date(guild.lastModified),
                          guild_last.lastModified,
                        );
                        detectiveRoster(
                          character_gm_old._id,
                          'character',
                          `${character_gm_old._id}#${guild._id}`,
                          `${character_gm_new._id}#${guild._id}`,
                          'title',
                          new Date(guild.lastModified),
                          guild_last.lastModified,
                        );
                        detectiveRoster(
                          `${guild._id}`,
                          'guild',
                          `${character_gm_old._id}`,
                          `${character_gm_new._id}`,
                          'title',
                          new Date(guild.lastModified),
                          guild_last.lastModified,
                        );
                      } else {
                        /** Transfer ownership */
                        detectiveRoster(
                          character_gm_new._id,
                          'character',
                          `${character_gm_old._id}#${guild._id}`,
                          `${character_gm_new._id}#${guild._id}`,
                          'ownership',
                          new Date(guild.lastModified),
                          guild_last.lastModified,
                        );
                        detectiveRoster(
                          character_gm_old._id,
                          'character',
                          `${character_gm_old._id}#${guild._id}`,
                          `${character_gm_new._id}#${guild._id}`,
                          'ownership',
                          new Date(guild.lastModified),
                          guild_last.lastModified,
                        );
                        detectiveRoster(
                          `${guild._id}`,
                          'guild',
                          `${character_gm_old._id}`,
                          `${character_gm_new._id}`,
                          'ownership',
                          new Date(guild.lastModified),
                          guild_last.lastModified,
                        );
                      }
                    }
                  }
                }
              }

              /**
               * If new member was found in old
               * check for rank change
               */
              if (members_old.some(({ id }) => id === guild_member.id)) {
                const guild_member_old = members_old.find(({ id }) => id === guild_member.id);
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
                    new Date(guild.lastModified),
                    guild_last.lastModified,
                  );
                  detectiveRoster(
                    `${guild._id}`,
                    'guild',
                    `${guild_member._id} // R:${guild_member_old.rank}`,
                    `${guild_member._id} // R:${guild_member.rank}`,
                    'demote',
                    new Date(guild.lastModified),
                    guild_last.lastModified,
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
                    new Date(guild.lastModified),
                    guild_last.lastModified,
                  );
                  detectiveRoster(
                    `${guild._id}`,
                    'guild',
                    `${guild_member._id} // R:${guild_member_old.rank}`,
                    `${guild_member._id} // R:${guild_member.rank}`,
                    'promote',
                    new Date(guild.lastModified),
                    guild_last.lastModified,
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
                  new Date(guild.lastModified),
                  guild_last.lastModified,
                );
                detectiveRoster(
                  `${guild._id}`,
                  'guild',
                  ``,
                  `${guild_member._id} // R:${guild_member.rank}`,
                  'join',
                  new Date(guild.lastModified),
                  guild_last.lastModified,
                );
              }
            }
            /** Push to guild.members */
            members_updated.push(guild_member);
          }
        }
        /** End of Members loop */

        /**
         * If old member not in a new_roster
         * then LEAVE
         */
        const leaves = differenceBy(members_old, members_updated, 'id');

        if (leaves && leaves.length) {
          for (let character_left of leaves) {
            detectiveRoster(
              character_left._id,
              'character',
              `${guild._id}#${guild.id} // R:${character_left.rank}`,
              ``,
              'leave',
              new Date(guild.lastModified),
              guild_last.lastModified,
            );
            detectiveRoster(
              `${guild._id}`,
              'guild',
              `${character_left._id} // R:${character_left.rank}`,
              ``,
              'leave',
              new Date(guild.lastModified),
              guild_last.lastModified,
            );
          }
        }
        /** Update old guild roster with a new roster */
        guild.members = undefined
        guild.members = members_updated;
      }

      /** If guild new, check rename version of it */
      if (guild.isNew) {
        /** Check was guild renamed */
        const guild_renamed = await guild_db.findOne({
          'id': guild.id,
          'realm.slug': guild.realm.slug,
        });
        if (guild_renamed) {
          await detectiveGuilds(guild_renamed, guild)
        }
      } else {
        await detectiveGuilds(guild_last, guild)
      }

      guild.markModified('members');
      await guild.save();
      console.info(`U:${(iterations) ? (iterations + ':') : ('')}${guild._id}:${guild.statusCode}`);
    }
  } catch (error) {
    console.error(`E,getGuild,${error}`);
  }
}

module.exports = getGuild;
