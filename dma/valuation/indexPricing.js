const battleNetWrapper = require('battlenet-api-wrapper');
const pricing_db = require("../../db/pricing_db");
const keys_db = require("../../db/keys_db");
const {connection} = require('mongoose');
/**
 *
 * @returns {Array}
 */

async function indexPricing () {
    try {
        console.time(`DMA-${indexPricing.name}`);
        const { _id, secret, token } = await keys_db.findOne({ tags: `Depo` });
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', 'en_GB');
        let {professions} = await bnw.WowGameData.getProfessionsIndex();
        for (let profession of professions) {
            //IDEA we could use category as expansion
            let {id, name, skill_tiers} = await bnw.WowGameData.getProfession(profession.id);
            if (skill_tiers) {
                for (let tier of skill_tiers) {
                    let {categories} = await bnw.WowGameData.getProfessionSkillTier(profession.id, tier.id);
                    if (categories) {
                        for (let category of categories) {
                            //IDEA name as tickers
                            let {name, recipes} = category;
                            for (let recipe of recipes) {
                                let x = await bnw.WowGameData.getRecipe(recipe.id);
                                console.log(x);
                            }
                        }
                    }
                }
            }
        }
        connection.close();
        console.timeEnd(`DMA-${indexPricing.name}`);
    } catch (err) {
        console.log(err);
    }
}

indexPricing();

module.exports = indexPricing;