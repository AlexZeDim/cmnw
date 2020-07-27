/**
 * Connection with DB
 */

const {connect, connection} = require('mongoose');
require('dotenv').config();
connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () => console.log('Connected to database on ' + process.env.hostname));

/**
 * Model importing
 */

const pricing_methods_db = require("../../db/pricing_methods_db");
const keys_db = require("../../db/keys_db");

/**
 * B.net Wrapper
 */

const battleNetWrapper = require('battlenet-api-wrapper');

/**
 * This function is based on Blizzard API or skilllineability.csv file
 *
 * @returns {Promise<void>}
 */

async function importMethodsBlizzardAPI () {
    try {
        console.time(`DMA-${importMethodsBlizzardAPI.name}`);
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
            ['Kul', 'BFA'],
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
                    let expansion_ticker = 'CLSC';
                    [...expansionTicker.entries()].some(([k,v]) => {
                        (tier.name.en_GB.includes(k)) ? (expansion_ticker = v) : ('')
                    });
                    let {categories} = await bnw.WowGameData.getProfessionSkillTier(profession.id, tier.id);
                    if (categories) {
                        for (let category of categories) {
                            let {recipes} = category;

                            for (let recipe of recipes) {

                                const [RecipeData, RecipeMedia] = await Promise.allSettled([
                                    bnw.WowGameData.getRecipe(recipe.id),
                                    bnw.WowGameData.getRecipeMedia(recipe.id)
                                ]);

                                if (RecipeData.value) {
                                    const recipe_data = RecipeData.value;

                                    let pricing_method = await pricing_methods_db.findById(recipe_data.id);

                                    if (!pricing_method) {
                                        pricing_method = new pricing_methods_db({
                                            _id: `P${recipe_data.id}`,
                                            recipe_id: parseInt(recipe_data.id),
                                            name: recipe_data.name,
                                            type: `primary`,
                                            createdBy: `DMA-${importMethodsBlizzardAPI.name}`,
                                            updatedBy: `DMA-${importMethodsBlizzardAPI.name}`,
                                        });
                                    }

                                    if (recipe_data.description) {
                                        pricing_method.description = recipe_data.description
                                    }
                                    if ("alliance_crafted_item" in recipe_data) {
                                        pricing_method.alliance_item_id = parseInt(recipe_data.alliance_crafted_item.id)
                                    }
                                    if ("horde_crafted_item" in recipe_data) {
                                        pricing_method.horde_item_id = parseInt(recipe_data.horde_crafted_item.id)
                                    }
                                    if (recipe_data.profession && professionsTicker.has(recipe_data.profession.id)) {
                                        pricing_method.profession = professionsTicker.get(recipe_data.profession.id)
                                    }
                                    if (expansion_ticker) {
                                        pricing_method.expansion = expansion_ticker;
                                    }
                                    if (recipe_data.rank) {
                                        pricing_method.rank = recipe_data.rank;
                                    }
                                    if ("crafted_quantity" in recipe_data) {
                                        pricing_method.item_quantity = recipe_data.crafted_quantity.value;
                                    }
                                    pricing_method.reagents = recipe_data.reagents.map(({reagent, quantity}) => {return {_id: parseInt(reagent.id) , quantity: parseInt(quantity)}});

                                    if (RecipeMedia.value) {
                                        pricing_method.media = RecipeMedia.value.assets[0].value
                                    }

                                    await pricing_method.save()
                                    console.info(`F:U,${pricing_method.expansion}:${pricing_method.profession}:${pricing_method._id},${pricing_method.name.en_GB}`)
                                }
                            }
                        }
                    }
                }
            }
        }
        connection.close();
        console.timeEnd(`DMA-${importMethodsBlizzardAPI.name}`);
    } catch (error) {
        console.error(`DMA-${importMethodsBlizzardAPI.name}`, error)
    }
}

importMethodsBlizzardAPI();