
const { toSlug } = require('../../db/setters');

/**
 *
 * @param name
 * @param realm
 * @param BlizzAPI
 * @returns {Promise<{}|{covenant: {}, ilvl: {}}>}
 */

async function updateSummary (name, realm, BlizzAPI) {
  try {
    const summary = {
      ilvl: {},
      covenant: {}
    }
    const response = await BlizzAPI.query(`/profile/wow/character/${realm}/${name}`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response) return {}
    const keys_named = ['gender', 'faction', 'race', 'character_class', 'active_spec']
    const keys = ['level', 'achievement_points']
    Object.entries(response).forEach(([key, value]) => {
      if (keys_named.includes(key)) {
        if (value.name) summary[key] = value.name
      }
      if (keys.includes(key) && value !== null) summary[key] = value
      if (key === 'last_login_timestamp') summary.lastModified = value
      if (key === 'average_item_level') summary.ilvl.avg = value
      if (key === 'equipped_item_level') summary.ilvl.eq = value
      if (key === 'covenant_progress'  && typeof value === 'object' && value !== null) {
        if (value.chosen_covenant && value.chosen_covenant.name) summary.covenant.chosen_covenant = value.chosen_covenant.name;
        if (value.renown_level) summary.covenant.renown_level = value.renown_level;
      }
      if (key === 'guild' && typeof value === 'object' && value !== null) {
        if (value.name) {
          summary.guild = {};
          summary.guild.name = value.name;
          summary.guild._id = toSlug(`${value.name}@${realm}`);
          summary.guild.slug = toSlug(value.name)
        }
      }
      if (key === 'realm' && typeof value === 'object' && value !== null) {
        if (value.id && value.name && value.slug) {
          summary.realm = {
            _id: value.id,
            name: value.name,
            slug: value.slug,
          }
        }
      }
      if (key === 'active_title' && typeof value === 'object' && value !== null) {
        if ('active_title' in value) {
          const { active_title } = value
          if (active_title.id) {
            summary.hash = { t: parseInt(active_title.id, 16) }
          }
        }
      }
    })
    summary.statusCode = 200;
    return summary
  } catch (error) {
    console.error(`E,updateSummary,${error}`)
    return {}
  }
}

module.exports = updateSummary;
