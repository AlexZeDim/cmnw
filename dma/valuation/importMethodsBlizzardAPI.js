/**
 * Mongo Models
 */
require('../../db/connection')
const pricing_methods_db = require('../../db/models/pricing_methods_db');
const keys_db = require('../../db/models/keys_db');

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
    console.time(`DMA-importMethodsBlizzardAPI`);
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
      let { skill_tiers } = await api.query(`/data/wow/profession/${profession.id}`, {
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
              let { recipes } = category;
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
                  let pricing_method = await pricing_methods_db.findById(`P${recipe_data.id}`);

                  if (!pricing_method) {
                    pricing_method = new pricing_methods_db({
                      _id: `P${recipe_data.id}`,
                      recipe_id: parseInt(recipe_data.id),
                      name: recipe_data.name,
                      type: `primary`,
                      createdBy: `DMA-importMethodsBlizzardAPI`,
                      updatedBy: `DMA-importMethodsBlizzardAPI`,
                    });
                  }

                  if (recipe.name) {
                    pricing_method.name = recipe_data.name;
                  }

                  if (recipe_data.description) {
                    pricing_method.description = recipe_data.description;
                  }
                  if ('alliance_crafted_item' in recipe_data) {
                    pricing_method.alliance_item_id = parseInt(
                      recipe_data.alliance_crafted_item.id,
                    );
                  }
                  if ('horde_crafted_item' in recipe_data) {
                    pricing_method.horde_item_id = parseInt(
                      recipe_data.horde_crafted_item.id,
                    );
                  }
                  if (profession.id && professionsTicker.has(profession.id)) {
                    pricing_method.profession = professionsTicker.get(profession.id);
                  }
                  if (expansion_ticker) {
                    pricing_method.expansion = expansion_ticker;
                  }
                  if (recipe_data.rank) {
                    pricing_method.rank = recipe_data.rank;
                  }
                  if ('crafted_quantity' in recipe_data) {
                    pricing_method.item_quantity =
                      recipe_data.crafted_quantity.value;
                  }
                  if (recipe_data.reagents && recipe_data.reagents.length) {
                    pricing_method.reagents = recipe_data.reagents.map(
                      ({ reagent, quantity }) => {
                        return {
                          _id: parseInt(reagent.id),
                          quantity: parseInt(quantity),
                        };
                      },
                    );
                  }
                  if (RecipeMedia.value) {
                    pricing_method.media = RecipeMedia.value.assets[0].value;
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

  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`DMA-importMethodsBlizzardAPI`);
    await process.exit(0)
  }
})();
