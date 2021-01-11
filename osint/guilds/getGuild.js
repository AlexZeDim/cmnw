/**
 * Model importing
 */

const guild_db = require('../../db/models/guilds_db');
const realms_db = require('../../db/models/realms_db');

/**
 * Modules
 */

const BlizzAPI = require('blizzapi');
const { updateGuildRoster, updateGuildSummary, updateLogsRoster } = require('./updaters');
const { detectiveGuildDiffs } = require('./detectives');
const { toSlug } = require('../../db/setters');

/**
 *
 * Request guild from Blizzard API and add it to OSINT-DB (guilds)
 * (if we found a new character from guild-members, then adding it to OSINT-DB (characters))
 * @param name {string}
 * @param realm {Object<{ _id: number, name: string, slug: string }>}
 * @param token {string=}
 * @param createOnlyUnique {Boolean=}
 * @param forceUpdate {Boolean=}
 * @param iterations {number=}
 * @param args {Object=}
 * @returns {Promise<{}|*>}
 */

const getGuild = async (
  {
    name,
    realm,
    token,
    createOnlyUnique = false,
    iterations,
    forceUpdate = false,
    ...args
  }
) => {
  try {

    const t = new Date().getTime();
    const guild_last = {};

    /**
     * Check realm before start
     */
    const realm_ = await realms_db.findOne({ $text: { $search: realm.slug } }, { _id: 1, slug: 1, name: 1 }).lean();
    if (!realm_) return

    const name_slug = toSlug(name);

    /**
     * BlizzAPI
     */
    const api = new BlizzAPI({
      region: 'eu',
      clientId: '530992311c714425a0de2c21fcf61c7d',
      clientSecret: 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP',
      accessToken: token
    });

    /**
     * Check if guild exists
     */
    let guild = await guild_db.findById(`${name_slug}@${realm_.slug}`);
    if (guild) {
      if (createOnlyUnique) {
        console.warn(`E:${(iterations) ? (iterations + ':') : ('')}${guild._id}:createOnlyUnique:${createOnlyUnique}`);
        return guild
      }
      if (!forceUpdate && ((t - (12 * 60 * 60 * 1000)) < guild.updatedAt.getTime())) {
        console.warn(`E:${(iterations) ? (iterations + ':') : ('')}${guild._id}:forceUpdate:${forceUpdate}`);
        return guild
      }
      Object.assign(guild_last, guild.toObject())
      guild.statusCode = 100;
      if (args.updatedBy) guild.updatedBy = args.updatedBy
    } else {
      guild = new guild_db({
        _id: `${name}@${realm_.slug}`,
        realm: realm_,
        members: [],
        id: Date.now(),
        statusCode: 100,
        createdBy: 'OSINT-getGuild',
        updatedBy: 'OSINT-getGuild',
      })
    }

    guild.realm = {
      _id: realm_._id,
      name: realm_.name,
      slug: realm_.slug,
    };

    /**
     * Request Data for Guild
     */
    const summary = await updateGuildSummary(name_slug, guild.realm.slug, api);
    Object.assign(guild, summary)

    const roster = await updateGuildRoster(guild.toObject(), api);
    if (roster) {
      guild.markModified('members');
      Object.assign(guild, { members: roster })
    }

    /** If guild new, check rename version of it */
    if (guild.isNew) {
      /** Check was guild renamed */
      const guild_renamed = await guild_db.findOne({
        'id': guild.id,
        'realm.slug': guild.realm.slug,
      }).lean();
      if (guild_renamed) await detectiveGuildDiffs(guild_renamed, guild.toObject())
    } else {
      await updateLogsRoster(guild_last, guild.toObject())
      await detectiveGuildDiffs(guild_last, guild.toObject())
    }

    await guild.save();
    console.info(`${(guild.isNew) ? ('C') : ('U')}:${(iterations) ? (iterations + ':') : ('')}${guild._id}:${guild.statusCode}`);
    return guild;
  } catch (error) {
    console.error(`E,getGuild,${error}`);
  }
}

module.exports = getGuild;
