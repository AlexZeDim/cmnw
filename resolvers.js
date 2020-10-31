const character_db = require('./db/models/characters_db');
const guild_db = require('./db/models/guilds_db');
const realms_db = require('./db/models/realms_db');
const osint_logs_db = require('./db/models/osint_logs_db');
const keys_db = require('./db/models/keys_db');

const getCharacter = require('./osint/characters/get_character');
const getGuild = require('./osint/guilds/get_guild')
const queryItemAndRealm = require('./routes/api/handle_item_realm');
const clusterChartData = require('./dma/valuations/cluster/cluster_chart.js');
const auctionsFeed = require('./dma/auctions/auctions_feed.js');
const auctionsData = require('./dma/auctions/auctions_data.js');
const goldsData = require('./dma/golds/gold_quotes.js');

const root = {
  character: async ({ id }) => {
    const character = await character_db.findById(id.toLowerCase());
    if (!character) {
      if (!id.includes('@')) {
        return
      }
      const [ nameSlug, realmSlug ] = id.split('@')

      const realm = await realms_db.findOne({ $text: { $search: realmSlug } }, { _id: 1, slug: 1, name: 1 });
      if (!realm) {
        return
      }
      const { token } = await keys_db.findOne({
        tags: `OSINT-indexCharacters`,
      });
      await getCharacter(
        { name: nameSlug, realm: { slug: realm.slug }, createdBy: `OSINT-userInput`, updatedBy: `OSINT-userInput`},
        token,
        true,
        true
      );
      return await character_db.findById(id.toLowerCase());
    }
    character.logs = await osint_logs_db.find({ root_id: character._id }).sort({ createdBy: -1 }).limit(1000)
    return character
  },
  guild: async ({ id }) => {
    const guild = await guild_db.findById(id.toLowerCase())
    if (!guild) {
      if (!id.includes('@')) {
        return
      }
      const [ nameSlug, realmSlug ] = id.split('@')

      const realm = await realms_db.findOne({ $text: { $search: realmSlug } }, { _id: 1, slug: 1, name: 1 });
      if (!realm) {
        return
      }
      const { token } = await keys_db.findOne({
        tags: `OSINT-indexCharacters`,
      });
      await getGuild(
        { name: nameSlug, realm: realm, createdBy: 'OSINT-userInput', updatedBy: 'OSINT-userInput' },
        token,
        true
      )
      return await guild_db.findById(id.toLowerCase())
    }
    return guild
  },
  item: async ({ id }) => {
    if (!id.includes('@')) {
      return
    }
    const [ itemQuery, realmQuery ] = id.split('@');
    const [ item, realm ] = await queryItemAndRealm(itemQuery, realmQuery);
    if (!item || !realm) {
      return
    }
    /** Commodity Block */
    let is_commdty = false;
    if (item.asset_class && item.asset_class.includes('COMMDTY')) {
      is_commdty = true;
    } else {
      if (item.stackable && item.stackable > 1) {
        is_commdty = true;
      }
      if (item._id === 122270 || item._id === 122284) {
        is_commdty = false
      }
    }
    if (item._id === 1) {
      is_commdty = true;
    }
  }
}

module.exports = root;
