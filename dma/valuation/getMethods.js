const pricing_db = require("../../db/pricing_db");

async function getMethods (id = 15389) {
    try {
        return await pricing_db.aggregate([
            {
                $match: {
                    item_id: id
                }
            },
            {
                $group: {
                    _id: "$item_id",
                    max: {
                        $max: "$rank"
                    },
                    data: {
                        $push: "$$ROOT"
                    }
                }
            },
            {
                $unwind: "$data"
            },
            {
                $match: {
                    $expr: {
                        $or: [
                            {
                                $eq: [
                                    {
                                        $type: "$data.rank"
                                    },
                                    "missing"
                                ]
                            },
                            {
                                $eq: [
                                    "$data.rank",
                                    "$max"
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $replaceWith: "$data"
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
                    item_id : 1,
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
                    tranches: "$tranche"
                }
            }
        ]);
    } catch (err) {
        console.error(err);
    }
}

module.exports = getMethods;