

/*const battleNetWrapper = require('battlenet-api-wrapper');
const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';*/

const items_db = require("../../db/items_db");
const pricing_db = require("../../db/pricing_db");

const {connection} = require('mongoose');

async function test (arg = {asset_class: "VANILLA", ticker: "J.POTION.REJUV"}) {
    try {
        let evaItems = await items_db.find({asset_class: "VANILLA", ticker: "J.POTION.HP"}).lean().limit(25);
        for (let evaItem of evaItems) {
            let pricing_methods = await pricing_db.aggregate([
                {
                    $match: {
                        item_id: evaItem._id, rank: {$exists: true, $gte: 2}
                    }
                },
                {
                    $lookup: {
                        from: "items",
                        localField: "reagents",
                        foreignField: "_id",
                        as: "reagents_items"
                    }
                },
                {
                    $project: {
                        "item_id" : 1,
                        reagents_items: 1,
                        spell_id: 1,
                        quantity: 1,
                        item_quantity: 1,
                    }
                },
                {
                    $addFields: {
                        reagents_items: {
                            $map: {
                                input: {
                                    $zip: {
                                        inputs: [
                                            "$quantity",
                                            "$reagents_items"
                                        ]
                                    }
                                },
                                as: "reagents_items",
                                in: {
                                    $mergeObjects: [
                                        {
                                            $arrayElemAt: [
                                                "$$reagents_items",
                                                1
                                            ]
                                        },
                                        {
                                            quantity: {
                                                $arrayElemAt: [
                                                    "$$reagents_items",
                                                    0
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$reagents_items"
                },
                {
                    $group: {
                        _id: {spell_id: "$spell_id", asset_class: "$reagents_items.asset_class", item_quantity: "$item_quantity"},
                        count: { $sum: 1 },
                        reagents: { $addToSet: "$reagents_items" },
                    }
                },
                {
                    $project: {
                        _id: "$_id.spell_id",
                        item_quantity: "$_id.item_quantity",
                        tranche: { asset_class: "$_id.asset_class", count: "$count", reagent_items: "$reagents"},
                    }
                },
                {
                    $group: {
                        _id: {spell_id: "$_id", item_quantity: "$item_quantity"},
                        tranche: { $addToSet: "$tranche" },
                    }
                },
                {
                    $project: {
                        _id: "$_id.spell_id",
                        item_quantity: "$_id.item_quantity",
                        tranches: "$tranche",
                    }
                },
            ]);
            const assetClassMap = new Map([
                ['CONST', 0],
                ['COMMDTY', 1],
                ['INDX', 2],
                ['VANILLA', 3],
                ['PREMIUM', 4],
            ]);
            console.log(pricing_methods);
            for (let {tranches} of pricing_methods) {
                tranches.sort((a, b) => assetClassMap.get(a.asset_class) - assetClassMap.get(b.asset_class));
                console.log(tranches);
                for (let {asset_class, count, reagent_items} of tranches) {
                    for (let reagent_item of reagent_items) {
                        console.log(reagent_items);
                    }
                }
            }

        }
        connection.close();
    } catch (err) {
        console.log(err);
    }
}

test();