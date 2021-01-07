const getCharacter = require('../characters/get_character');
const characters_db = require('../../db/models/characters_db');
const { differenceBy } = require('lodash');
const { detectiveRoster } = require('./detectives')
const { toSlug } = require('../../db/setters');

/**
 *
 * @param guild_slug
 * @param realm_slug
 * @param BlizzAPI
 * @returns {Promise<{}>}
 */
const updateGuildSummary = async (guild_slug, realm_slug, BlizzAPI) => {
  try {
    const summary = {}
    const response = await BlizzAPI.query(`/data/wow/guild/${realm_slug}/${guild_slug}`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response) return summary
    const keys = ['id', 'name', 'crest', 'achievement_points', 'member_count', 'created_timestamp']
    if (Object.keys(response).length) {
      Object.entries(response).forEach(([key, value]) => {
        if (keys.includes(key)) {
          summary[key] = value
        }
        if (key === 'realm' && typeof value === 'object' && value !== null) {
          if (value.id && value.name && value.slug) {
            summary.realm = {};
            summary.realm._id = value.id
            summary.realm.name = value.name
            summary.realm.slug = value.slug
          }
        }
        if (key === 'faction' && typeof value === 'object' && value !== null) {
          if (value.type && value.name === null) {
            if (value.type.toString().startsWith('A')) summary.faction = 'Alliance'
            if (value.type.toString().startsWith('H')) summary.faction = 'Horde'
          } else {
            summary.faction = value.name
          }
        }
        if (key === 'lastModified') summary.lastModified = new Date(response['lastModified'])
      });
    }
    summary.statusCode = 200;
    return summary
  } catch (error) {
    console.error(`E,${updateGuildSummary.name},${guild_slug}@${realm_slug}:${error}`)
  }
}

/**
 *
 * @param name {string}
 * @param realm {{_id: string, slug: string}}
 * @param faction {string}
 * @param args {Object}
 * @param BlizzAPI
 * @returns {Promise<{}|[]>}
 */
const updateGuildRoster = async ({ name, realm, faction, ...args }, BlizzAPI) => {
  if (!name || !realm.slug) return {}
  try {
    const name_slug = toSlug(name);
    const response = await BlizzAPI.query(`/data/wow/guild/${realm.slug}/${name_slug}/roster`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || !response.members) return {}

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

    const members = [];
    const array = [];
    let iterations = 0

    for (const member of response.members) {
      if ('character' in member && 'rank' in member) {
        array.push(
          getCharacter({
            id: member.character.id,
            name: member.character.name,
            realm: {
              id: realm.id,
              name: realm.name,
              slug: realm.slug,
            },
            guild: {
              _id: `${name_slug}@${realm.slug}`,
              name: name,
              rank: member.rank,
            },
            character_class: ('playable_class' in member.character && playable_class.has(member.character.playable_class.id)) ? (playable_class.get(member.character.playable_class.id)) : undefined,
            faction: (faction) ? (faction) : undefined,
            level: (member.character.level) ? (parseInt(member.character.level)) : undefined,
            lastModified: (args.lastModified) ? (args.lastModified) : undefined,
            updatedBy: (args.updatedBy) ? (args.updatedBy) : undefined,
            token: (BlizzAPI.accessToken) ? (BlizzAPI.accessToken) : undefined,
            iterations: iterations++,
            guildRank: true,
            createOnlyUnique: true
          })
        )
        if (array.length >= 10 || member.character.id === response.members[response.members.length - 1]) {
          await Promise.allSettled(array)
          array.length = 0;
        }
        members.push({
          _id: `${member.character.name}@${realm.slug}`.toLowerCase(),
          id: parseInt(member.character.id),
          rank: parseInt(member.rank),
        })
      }
    }
    return members
  } catch (error) {
    console.error(`E,${updateGuildRoster.name},${name}@${realm.slug}:${error}`)
  }
}

/**
 *
 * @param guild_last {Object}
 * @param guild {Object}
 */
const updateLogsRoster = async (guild_last, guild) => {
  if (!Array.isArray(guild_last.members) || !guild_last.members.length) return
  if (!Array.isArray(guild.members) || !guild.members.length) return
  try {

    const gm_new = guild.members.find(m => parseInt(m.rank) === 0);
    const gm_old = guild_last.members.find(m => parseInt(m.rank) === 0);
    /** Transfer of power has been made */
    if (gm_old.id !== gm_new.id) {
      /** Receive both characters */
      const [character_gm_old, character_gm_new] = await Promise.all([
        await getCharacter({
          id: gm_new.id,
          name: gm_new._id.toString().split('@')[0],
          realm: { slug: guild.realm.slug },
          forceUpdate: true
        }),
        await getCharacter({
          id: gm_old.id,
          name: gm_old._id.toString().split('@')[0],
          realm: { slug: guild.realm.slug },
          forceUpdate: true
        })
      ]);
      /** Make sure that both exists and have hash values to check */
      if (character_gm_old && character_gm_new) {
        /** Transfer title */
        if (character_gm_old.hash_a && character_gm_new.hash_a && character_gm_old.hash_a === character_gm_new.hash_a) {
          await Promise.all([
            await detectiveRoster(
              character_gm_new._id,
              'character',
              `${character_gm_old._id}#${guild._id}`,
              `${character_gm_new._id}#${guild._id}`,
              'title',
              guild.lastModified,
              guild_last.lastModified,
            ),
            await detectiveRoster(
              character_gm_old._id,
              'character',
              `${character_gm_old._id}#${guild._id}`,
              `${character_gm_new._id}#${guild._id}`,
              'title',
              guild.lastModified,
              guild_last.lastModified,
            ),
            await detectiveRoster(
              `${guild._id}`,
              'guild',
              `${character_gm_old._id}`,
              `${character_gm_new._id}`,
              'title',
              guild.lastModified,
              guild_last.lastModified,
            ),
          ])
        }
        if (character_gm_old.hash_a && character_gm_new.hash_a && character_gm_old.hash_a !== character_gm_new.hash_a) {
          /** Transfer ownership */
          await Promise.all([
            await detectiveRoster(
              character_gm_new._id,
              'character',
              `${character_gm_old._id}#${guild._id}`,
              `${character_gm_new._id}#${guild._id}`,
              'ownership',
              guild.lastModified,
              guild_last.lastModified,
            ),
            await detectiveRoster(
              character_gm_old._id,
              'character',
              `${character_gm_old._id}#${guild._id}`,
              `${character_gm_new._id}#${guild._id}`,
              'ownership',
              guild.lastModified,
              guild_last.lastModified,
            ),
            await detectiveRoster(
              `${guild._id}`,
              'guild',
              `${character_gm_old._id}`,
              `${character_gm_new._id}`,
              'ownership',
              guild.lastModified,
              guild_last.lastModified,
            )
          ])
        }
        if (!character_gm_old.hash_a || !character_gm_new.hash_a) {
          /** Transfer ownership */
          await Promise.all([
            await detectiveRoster(
              character_gm_new._id,
              'character',
              `${character_gm_old._id}#${guild._id}`,
              `${character_gm_new._id}#${guild._id}`,
              'ownership',
              guild.lastModified,
              guild_last.lastModified,
            ),
            await detectiveRoster(
              character_gm_old._id,
              'character',
              `${character_gm_old._id}#${guild._id}`,
              `${character_gm_new._id}#${guild._id}`,
              'ownership',
              guild.lastModified,
              guild_last.lastModified,
            ),
            await detectiveRoster(
              `${guild._id}`,
              'guild',
              `${character_gm_old._id}`,
              `${character_gm_new._id}`,
              'ownership',
              guild.lastModified,
              guild_last.lastModified,
            )
          ])
        }
      }
    }

    await Promise.all(guild.members.map(async guild_member => {
      if (guild_last.members.some(({ id }) => id === guild_member.id)) {
        const guild_member_old = guild_last.members.find(({ id }) => id === guild_member.id);
        /**
         * Demote
         */
        if (guild_member.rank > guild_member_old.rank) {
          await Promise.all([
            detectiveRoster(
              guild_member._id,
              'character',
              `${guild._id}#${guild.id} // R:${guild_member_old.rank}`,
              `${guild._id}#${guild.id} // R:${guild_member.rank}`,
              'demote',
              guild.lastModified,
              guild_last.lastModified,
            ),
            detectiveRoster(
              `${guild._id}`,
              'guild',
              `${guild_member._id} // R:${guild_member_old.rank}`,
              `${guild_member._id} // R:${guild_member.rank}`,
              'demote',
              guild.lastModified,
              guild_last.lastModified,
            )
          ])
        }
        /**
         * Promote
         */
        if (guild_member.rank < guild_member_old.rank) {
          await Promise.all([
            await detectiveRoster(
              guild_member._id,
              'character',
              `${guild._id}#${guild.id} // R:${guild_member_old.rank}`,
              `${guild._id}#${guild.id} // R:${guild_member.rank}`,
              'promote',
              guild.lastModified,
              guild_last.lastModified,
            ),
            await detectiveRoster(
              `${guild._id}`,
              'guild',
              `${guild_member._id} // R:${guild_member_old.rank}`,
              `${guild_member._id} // R:${guild_member.rank}`,
              'promote',
              guild.lastModified,
              guild_last.lastModified,
            )
          ])
        }
      } else {
        /**
         * If member not in a old members
         * then JOINS
         */
        await Promise.all([
          await detectiveRoster(
            guild_member._id,
            'character',
            ``,
            `${guild._id}#${guild.id} // R:${guild_member.rank}`,
            'join',
            guild.lastModified,
            guild_last.lastModified,
          ),
          await detectiveRoster(
            `${guild._id}`,
            'guild',
            ``,
            `${guild_member._id} // R:${guild_member.rank}`,
            'join',
            guild.lastModified,
            guild_last.lastModified,
          )
        ])
      }
    }))
    /**
     * If old member not in a new_roster
     * then LEAVE
     */
    const leaves = differenceBy(guild_last.members, guild.members, 'id');

    if (!leaves.length) return

    await Promise.all(leaves.map(async character_left => {
      await Promise.all([
        await characters_db.findByIdAndUpdate(character_left._id, { $unset: { "guild": 1 } }),
        await detectiveRoster(
          character_left._id,
          'character',
          `${guild._id}#${guild.id} // R:${character_left.rank}`,
          ``,
          'leave',
          guild.lastModified,
          guild_last.lastModified,
        ),
        await detectiveRoster(
          `${guild._id}`,
          'guild',
          `${character_left._id} // R:${character_left.rank}`,
          ``,
          'leave',
          guild.lastModified,
          guild_last.lastModified,
        ),
      ])
    }))
  } catch (error) {
    console.error(`E,${updateLogsRoster.name}:${error}`)
  }
}

module.exports = { updateGuildSummary, updateGuildRoster, updateLogsRoster }
