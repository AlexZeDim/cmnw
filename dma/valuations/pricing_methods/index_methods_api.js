/**
 * Mongo Models
 */
require('../../../db/connection')
const spell_reagents_db = require('../../../db/models/spell_reagents_db');
const spell_effect_db = require('../../../db/models/spell_effect_db');
const skill_line_db = require('../../../db/models/skill_line_db');
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
                  const recipe_data = { ...RecipeData.value };

                  recipe_data.recipe_id = recipe_data.id
                  /**
                   * Only SkillLineDB stores recipes by it's ID
                   * so we need that spell_id later
                   */
                  const recipe_spell = await skill_line_db.findById(recipe_data.id);
                  if (!recipe_spell) {
                    console.error(`Consensus not found for ${recipe_data.id}`)
                    return
                  }

                  recipe_data.spell_id = recipe_spell.spell_id
                  const pricing_spell = await spell_effect_db.findOne({ spell_id: recipe_data.spell_id })

                  if (expansion_ticker) recipe_data.expansion = expansion_ticker;

                  /**
                   * Skip Mass mill and prospect
                   * because they are bugged
                   */
                  if (recipe_data.name && recipe_data.name.en_GB && recipe_data.name.en_GB.includes('Mass')) continue

                  /**
                   * Rebuild reagent items
                   */
                  if (recipe_data.reagents && recipe_data.reagents.length) {
                    recipe_data.reagents = recipe_data.reagents.map(({ reagent, quantity }) => ({
                        _id: parseInt(reagent.id),
                        quantity: parseInt(quantity),
                      })
                    );
                  } else {
                    const pricing_ = await spell_reagents_db.findOne({ spell_id: recipe_data.spell_id });
                    if (pricing_ && pricing_.reagents && pricing_.reagents.length) recipe_data.reagents = pricing_.reagents;
                    if (!pricing_) console.error(`Reagent items not found for item:${recipe_data.id}:${recipe_data.spell_id}`)
                  }

                  /**
                   * If we don't have quantity from API,
                   * then use locale source
                   * and notify user about it
                   */
                  if ('crafted_quantity' in recipe_data) {
                    if ('value' in recipe_data.crafted_quantity) {
                      recipe_data.item_quantity = recipe_data.crafted_quantity.value;
                    } else if ('minimum' in recipe_data.crafted_quantity) {
                      recipe_data.item_quantity = recipe_data.crafted_quantity.minimum;
                    } else if (pricing_spell.item_quantity && (recipe_data.item_quantity === 0 || !recipe_data.item_quantity)) {
                      recipe_data.item_quantity = pricing_spell.item_quantity;
                    }
                  } else if (pricing_spell.item_quantity) {
                    recipe_data.item_quantity = pricing_spell.item_quantity;
                  }


                  if (profession.id && professionsTicker.has(profession.id)) recipe_data.profession = professionsTicker.get(profession.id);
                  if (!recipe_data && recipe_spell.skill_line) professionsTicker.get(recipe_spell.skill_line)

                  if (RecipeMedia.value) recipe_data.media = RecipeMedia.value.assets[0].value;

                  if (recipe_data.modified_crafting_slots) {
                    recipe_data.modified_crafting_slots = recipe_data.modified_crafting_slots.map(({slot_type, display_order}) => ({
                      _id: slot_type.id,
                      name: slot_type.name,
                      display_order: display_order
                    }))
                  }

                  recipe_data.type = 'primary';
                  recipe_data.createdBy = `DMA-API`;
                  recipe_data.updatedBy = `DMA-API`;

                  const writeConcerns = [];

                  if ('alliance_crafted_item' in recipe_data) {
                    if ('id' in recipe_data.alliance_crafted_item) {
                      writeConcerns.push({...recipe_data, ...{
                        ticker: `${recipe_data.profession}#${recipe_data.id}:P${recipe_data.alliance_crafted_item.id}A`,
                        faction: 'Alliance',
                        item_id: recipe_data.alliance_crafted_item.id
                      }})
                    }
                  }
                  if ('horde_crafted_item' in recipe_data) {
                    if ('id' in recipe_data.horde_crafted_item) {
                      writeConcerns.push({...recipe_data, ...{
                        ticker: `${recipe_data.profession}#${recipe_data.id}:P${recipe_data.horde_crafted_item.id}H`,
                        faction: 'Horde',
                        item_id: recipe_data.horde_crafted_item.id
                      }})
                    }
                  }
                  if ('crafted_item' in recipe_data) {
                    if ('id' in recipe_data.crafted_item) {
                      writeConcerns.push({...recipe_data, ...{
                        ticker: `${recipe_data.profession}#${recipe_data.id}:P${recipe_data.crafted_item.id}`,
                        item_id: recipe_data.crafted_item.id
                      }})
                    }
                  }
                  /**
                   * If item_id is not found, then cover it with
                   * spell_effect data via spell_id and check item_quantity
                   */
                  if (!writeConcerns.length && recipe_data.spell_id) {
                    console.error(`Recipe #${recipe_data.id}:${recipe_data.spell_id} requesting local item data!`)
                    if (pricing_spell.item_id) writeConcerns.push({
                      ...recipe_data,
                      ...{
                        ticker: `${recipe_data.profession}#${recipe_data.id}:P${pricing_spell.item_id}`,
                        item_id: pricing_spell.item_id
                      }
                    })
                  }

                  for (const concerns of writeConcerns) {

                    const pricing_method = await pricing_methods_db.findOneAndUpdate(
                    { item_id: concerns.item_id, recipe_id: concerns.recipe_id },
                      concerns,
                      {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true,
                        lean: true,
                      }
                    )
                    console.info(`U,${pricing_method.expansion}:${pricing_method.profession}:${pricing_method.item_id},${pricing_method.name.en_GB}`);
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
