/**
 * Mongo Models
 */
require('../../../db/connection')
const pricing_methods_db = require('../../../db/models/pricing_methods_db');
const keys_db = require('../../../db/models/keys_db');

/**
 * B.net Wrapper
 */

const BlizzAPI = require('blizzapi');

/**
 * This function is based on Blizzard API or skilllineability.csv file
 *
 * @returns {Promise<void>}
 */

(async () => {
  try {
    console.time(`DMA-API`);
    const professionsTicker = new Map([
      [164, 'BSMT'],
      [165, 'LTHR'],
      [171, 'ALCH'],
      [182, 'HRBS'],
      [185, 'COOK'],
      [186, 'ORE'],
      [197, 'CLTH'],
      [202, 'ENGR'],
      [333, 'ENCH'],
      [356, 'FISH'],
      [393, 'SKIN'],
      [755, 'JWLC'],
      [773, 'INSC'],
      [794, 'ARCH'],
    ]);
    const expansionTicker = new Map([
      ['Shadowlands', 'SHDW'],
      ['Kul', 'BFA'],
      ['Zandalari', 'BFA'],
      ['Legion', 'LGN'],
      ['Draenor', 'WOD'],
      ['Pandaria', 'MOP'],
      ['Cataclysm', 'CATA'],
      ['Northrend', 'WOTLK'],
      ['Outland', 'TBC'],
    ]);
    const { _id, secret, token } = await keys_db.findOne({ tags: `Depo` });
    const api = new BlizzAPI({
      region: 'eu',
      clientId: _id,
      clientSecret: secret,
      accessToken: token
    });
    const { professions } = await api.query(`/data/wow/profession/index`, {
      timeout: 10000,
      headers: { 'Battlenet-Namespace': 'static-eu' }
    });
    for (let profession of professions) {
      const { skill_tiers } = await api.query(`/data/wow/profession/${profession.id}`, {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' }
      });
      if (skill_tiers) {
        for (let tier of skill_tiers) {
          let expansion_ticker = 'CLSC';
          [...expansionTicker.entries()].some(([k, v]) => {
            tier.name.en_GB.includes(k) ? (expansion_ticker = v) : '';
          });
          let { categories } = await api.query(`/data/wow/profession/${profession.id}/skill-tier/${tier.id}`, {
            timeout: 10000,
            headers: { 'Battlenet-Namespace': 'static-eu' }
          })
          if (categories) {
            for (let category of categories) {
              const { recipes } = category;
              for (let recipe of recipes) {
                const [RecipeData, RecipeMedia] = await Promise.allSettled([
                  api.query(`/data/wow/recipe/${recipe.id}`, {
                    timeout: 10000,
                    headers: { 'Battlenet-Namespace': 'static-eu' }
                  }),
                  api.query(`/data/wow/media/recipe/${recipe.id}`, {
                    timeout: 10000,
                    headers: { 'Battlenet-Namespace': 'static-eu' }
                  })
                ]);
                if (RecipeData.value) {
                  const recipe_data = RecipeData.value;

                  const writeConcerns = [];

                  if ('alliance_crafted_item' in recipe_data) {
                    if ('id' in recipe_data.alliance_crafted_item) {
                      writeConcerns.push({
                        faction: 'Alliance',
                        item_id: recipe_data.alliance_crafted_item.id
                      })
                    }
                  }
                  if ('horde_crafted_item' in recipe_data) {
                    if ('id' in recipe_data.horde_crafted_item) {
                      writeConcerns.push({
                        faction: 'Horde',
                        item_id: recipe_data.horde_crafted_item.id
                      })
                    }
                  }
                  if ('crafted_item' in recipe_data) {
                    if ('id' in recipe_data.crafted_item) {
                      writeConcerns.push({
                        item_id: recipe_data.crafted_item.id
                      })
                    }
                  }

                  if (!writeConcerns.length) continue

                  for (const concerns of writeConcerns) {
                    const _id = `P${concerns.item_id}${(concerns.faction) ? (concerns.faction[0]) : ('')}`;

                    let pricing_method = await pricing_methods_db.findById(_id);

                    if (!pricing_method) {
                      pricing_method = new pricing_methods_db({
                        _id: _id,
                        recipe_id: parseInt(recipe_data.id),
                        item_id: concerns.item_id,
                        type: `primary`,
                        createdBy: `DMA-API`,
                        updatedBy: `DMA-API`,
                      });
                    }

                    if (recipe.name) pricing_method.name = recipe_data.name;

                    if (recipe_data.description) pricing_method.description = recipe_data.description;

                    if (profession.id && professionsTicker.has(profession.id)) pricing_method.profession = professionsTicker.get(profession.id);

                    if (expansion_ticker) pricing_method.expansion = expansion_ticker;

                    if (recipe_data.rank) pricing_method.rank = recipe_data.rank;

                    if ('crafted_quantity' in recipe_data) {
                      if ('value' in recipe_data.crafted_quantity) {
                        pricing_method.item_quantity = recipe_data.crafted_quantity.value;
                      } else if ('minimum' in recipe_data.crafted_quantity) {
                        pricing_method.item_quantity = recipe_data.crafted_quantity.minimum;
                      }
                    }

                    if (recipe_data.reagents && recipe_data.reagents.length) {
                      pricing_method.reagents = recipe_data.reagents.map(({ reagent, quantity }) => ({
                          _id: parseInt(reagent.id),
                          quantity: parseInt(quantity),
                        })
                      );
                    }

                    if (RecipeMedia.value) {
                      pricing_method.media = RecipeMedia.value.assets[0].value;
                    }


                    if (recipe_data.modified_crafting_slots) {
                      recipe_data.modified_crafting_slots.map(({slot_type, display_order}) => ({
                        _id: slot_type.id,
                        name: slot_type.name,
                        display_order: display_order
                      }))
                    }

                    await pricing_method.save();
                    console.info(`F:U,${pricing_method.expansion}:${pricing_method.profession}:${pricing_method._id},${pricing_method.name.en_GB}`);
                  }
                }
              }
            }
          }
        }
      }
    }

  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`DMA-API`);
    await process.exit(0)
  }
})();
