/**
 * Mongo Models
 */
require('../../db/connection')
const realms_db = require('../../db/models/realms_db');
const characters_db = require('../../db/models/characters_db');
const guilds_db = require('../../db/models/guilds_db');

/**
 * Modules
 * TODO indexRealms
 */

const schedule = require('node-schedule');

const countPopulation = async () => {
  /**
   * Constants requires for
   * calculation of max level characters
   * and professions data
   */
  const max_level = 60;

  const professions = [
    {
      "name": "Blacksmithing",
      "id": 164
    },
    {
      "name": "Leatherworking",
      "id": 165
    },
    {
      "name": "Alchemy",
      "id": 171
    },
    {
      "name": "Herbalism",
      "id": 182
    },
    {
      "name": "Cooking",
      "id": 185
    },
    {
      "name": "Mining",
      "id": 186
    },
    {
      "name": "Tailoring",
      "id": 197
    },
    {
      "name": "Engineering",
      "id": 202
    },
    {
      "name": "Enchanting",
      "id": 333
    },
    {
      "name": "Fishing",
      "id": 356
    },
    {
      "name": "Skinning",
      "id": 393
    },
    {
      "name": "Jewelcrafting",
      "id": 755
    },
    {
      "name": "Inscription",
      "id": 773
    },
    {
      "name": "Archaeology",
      "id": 794
    },
    {
      "name": "Soul Cyphering",
      "id": 2777
    },
    {
      "name": "Abominable Stitching",
      "id": 2787
    },
    {
      "name": "Ascension Crafting",
      "id": 2791
    }
  ]


  try {
    console.time(`OSINT-count_population`);

    /** Unique classes from players */
    const classes_unique = await characters_db.find({ 'realm.slug': 'eversong', character_class: { $ne: null } }).distinct('character_class')

    await realms_db.find().cursor().eachAsync(async realm => {

      /**
       * Calculations populations for each realm
       * full copy to new variable and remove old data
       */
      const populations = []; //TODO fixme
      realm.populations = undefined;

      const realm_population = {};

      /**
       * Characters balance
       */
      realm_population.characters_total = await characters_db.countDocuments({ 'realm.slug': realm.slug })
      realm_population.characters_active =  await characters_db.countDocuments({ 'realm.slug': realm.slug, statusCode: 200 })
      realm_population.characters_active_alliance = await characters_db.countDocuments({ 'realm.slug': realm.slug, statusCode: 200, faction: 'Alliance' })
      realm_population.characters_active_horde = await characters_db.countDocuments({ 'realm.slug': realm.slug, statusCode: 200, faction: 'Horde' })
      realm_population.characters_active_max_level = await characters_db.countDocuments({ 'realm.slug': realm.slug, statusCode: 200, level: max_level })
      realm_population.characters_guild_members = await characters_db.countDocuments({ 'realm.slug': realm.slug, guild: { $ne: null } });
      realm_population.characters_guildless = await characters_db.countDocuments({ 'realm.slug': realm.slug, guild: { $exists: false } });
      const players_unique = await characters_db.find({ 'realm.slug': realm.slug }).distinct('personality')
      realm_population.players_unique = players_unique.length
      const players_active_unique = await characters_db.find({ 'realm.slug': realm.slug, statusCode: 200 }).distinct('personality')
      realm_population.players_active_unique = players_active_unique.length

      /**
       * Class popularity among
       * every active character
       */
      const characters_classes_populations = [];
      for (const character_class of classes_unique) {
        characters_classes_populations.push({
          name: character_class,
          value: await characters_db.countDocuments({
            'realm.slug': realm.slug,
            statusCode: 200,
            character_class: character_class
          })
        })
      }
      realm_population.characters_classes = characters_classes_populations;

      /**
       * Measure crafting professions
       * for every active character
       */
      const characters_professions = [];
      for (const { name, id } of professions) {
        characters_professions.push({
          name: name,
          value: await characters_db.countDocuments({
            'realm.slug': realm.slug,
            statusCode: 200,
            'professions.id': id
          })
        })
      }
      realm_population.characters_professions = characters_professions;

      /**
       * Count covenant stats
       * for every active character
       */
      const characters_covenants = [];
      for (const covenant of ['Kyrian', 'Venthyr', 'Night Fae', 'Necrolord']) {
        characters_covenants.push({
          name: covenant,
          value: await characters_db.countDocuments({ 'realm.slug': realm.slug, statusCode: 200, 'chosen_covenant': covenant }),
          group: await characters_db.aggregate([
            {
              $match: {
                'realm.slug': realm.slug,
                'chosen_covenant': covenant
              }
            },
            {
              $group: {
                _id: '$renown_level',
                value: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                level: "$_id",
                value: 1
              }
            }
          ])
        })
      }
      realm_population.characters_covenants = characters_covenants;

      /**
       * Guild number
       * and their faction balance
       */
      realm_population.guilds_total = await guilds_db.countDocuments({'realm.slug': realm.slug})
      realm_population.guilds_alliance = await guilds_db.countDocuments({'realm.slug': realm.slug, faction: 'Alliance'})
      realm_population.guilds_horde = await guilds_db.countDocuments({'realm.slug': realm.slug, faction: 'Horde'})

      realm_population.timestamp = new Date().getTime();

      /**
       *  If array length in more then 11
       *  remove the first element
       *  CAPPED 10
       */

      populations.push(realm_population)
      if (populations.length > 10) {
        populations.shift()
      }

      realm.populations = populations;
      realm.markModified('populations');
      await realm.save()
      console.info(`U,${realm.name_locale}`)
    })
  } catch (error) {
    console.error(`${error}`);
  } finally {
    console.timeEnd(`OSINT-count_population`);
    process.exit(0)
  }
}
countPopulation()
/*schedule.scheduleJob('0 5 1,8,17,26 * *', () => {
  countPopulation().then(r => r);
})*/
