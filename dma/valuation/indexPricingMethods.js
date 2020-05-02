const pricing_methods = require("../../db/pricing_methods_db");
const {connection} = require('mongoose');

async function indexPricingMethods() {
    try {
        let cursor = await pricing_methods.aggregate([
            {
                $match: {
                    expansion: "BFA"
                }
            },
            {
                $lookup: {
                    from: "items",
                    localField: "reagents._id",
                    foreignField: "_id",
                    as: "reagent_items"
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    media: 1,
                    horde_item_id: 1,
                    alliance_item_id: 1,
                    item_id: 1,
                    item_quantity: 1,
                    spell_id: 1,
                    profession: 1,
                    expansion: 1,
                    rank: 1,
                    reagent_items: {
                        $map: {
                            input: "$reagent_items",
                            as: "ri",
                            in: {
                                $mergeObjects: [
                                    "$$ri",
                                    {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$reagents",
                                                    cond: {
                                                        $eq: [
                                                            "$$this._id",
                                                            "$$ri._id"
                                                        ]
                                                    }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ]).cursor({batchSize: 1}).exec();
        cursor.on('data', async (craft_quene) => {
            //cursor.pause();
            console.time('===');

            let vanilla_MethodsCombinations = [];
            let reagent_items = [...craft_quene.reagent_items.filter(reagent_item => reagent_item.asset_class === 'VANILLA')];
            console.log(reagent_items);

            console.timeEnd('===');
            //cursor.resume();
        });
        cursor.on('close', async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
            connection.close();
        });
    } catch (err) {
        console.error(err);
    }
}

indexPricingMethods();