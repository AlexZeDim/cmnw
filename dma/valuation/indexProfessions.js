const battleNetWrapper = require('battlenet-api-wrapper');
const professions_db = require("../../db/professions_db");
const keys_db = require("../../db/keys_db");
const {connection} = require('mongoose');

/**
 * This function is based on Blizzard API or skilllineability.csv file
 *
 * @returns {Promise<void>}
 */

async function indexProfessions () {
    try {
        console.time(`DMA-${indexProfessions.name}`);
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
            ['Kul Tiran', 'BFA'],
            ['Zandalari', 'BFA'],
            ['Legion', 'LGN'],
            ['Draenor', 'WOD'],
            ['Pandaria', 'MOP'],
            ['Cataclysm', 'CATA'],
            ['Northrend', 'WOTLK'],
            ['Outland', 'TBC']
        ]);
        const { _id, secret, token } = await keys_db.findOne({ tags: `Depo` });
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', '');
        let {professions} = await bnw.WowGameData.getProfessionsIndex();
        for (let profession of professions) {
            let {skill_tiers} = await bnw.WowGameData.getProfession(profession.id);
            if (skill_tiers) {
                for (let tier of skill_tiers) {
                    let expansion_ticker;
                    for (let [value, index] of expansionTicker.entries()) {
                        if (tier.name.en_GB.includes(value)) {
                            expansion_ticker = index;
                        }
                    }
                    let {categories} = await bnw.WowGameData.getProfessionSkillTier(profession.id, tier.id);
                    if (categories) {
                        for (let category of categories) {
                            //IDEA category.name form ticker for item
                            let {recipes} = category;
                            let result = {};
                            for (let recipe of recipes) {
                                await Promise.all([
                                    bnw.WowGameData.getRecipe(recipe.id).then(({alliance_crafted_item, description, crafted_item, hasOwnProperty, horde_crafted_item, id, name, rank, reagents}) => {
                                        result._id = id;
                                        result.name = name;
                                        if (description) {
                                            result.description = description;
                                        }
                                        if (alliance_crafted_item) {
                                            result.alliance_item_id = parseFloat(alliance_crafted_item.id)
                                        }
                                        if (horde_crafted_item) {
                                            result.horde_item_id = parseFloat(horde_crafted_item.id)
                                        }
                                        if (crafted_item) {
                                            result.item_id = parseFloat(crafted_item.id)
                                        }
                                        if (professionsTicker.has(profession.id)) {
                                            result.profession = professionsTicker.get(profession.id)
                                        }
                                        if (expansion_ticker) {
                                            result.expansion = expansion_ticker;
                                        }
                                        if (rank) {
                                            result.rank = rank;
                                        }
                                        result.reagents = reagents.map(({reagent, quantity}) => {return {_id: reagent.id , quantity: quantity}});
                                    }).catch(e=>e),
                                    bnw.WowGameData.getRecipeMedia(recipe.id).then(({assets}) => {
                                        result.icon = assets[0].value
                                    }).catch(e=>e)
                                ]);
                                await professions_db.findByIdAndUpdate(
                                {
                                    _id: result._id
                                },
                                result,
                                {
                                    upsert: true,
                                    new: true,
                                    lean: true
                                }).then(doc => console.info(doc._id));
                            }
                        }
                    }
                }
            }
        }
        connection.close();
        console.timeEnd(`DMA-${indexProfessions.name}`);
    } catch (error) {
        console.error(error)
    }
}

indexProfessions();