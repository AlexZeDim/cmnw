const pricing_methods = require("../../../db/pricing_methods_db");

async function premiumSingleName (item_id) {
    return pricing_methods.aggregate([
        {
            $lookup: {
                from: "items",
                localField: "item_id",
                foreignField: "_id",
                as: "item"
            }
        },
        {
            $match: {
                reagent_items: {$elemMatch: {_id: item_id}},
                "item.is_auctionable": true
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
            $group: {
                _id: {
                    v_class: "$reagent_items.v_class",
                    recipe_id: "$_id"
                },
                method: {$push: '$$ROOT'}
            }
        },
        {
            $unwind: "$_id.v_class"
        },
        {
            $match: {
                "_id.v_class": "PREMIUM"
            }
        },
        {
            $group: {
                _id: "$_id.recipe_id",
                count: {
                    $sum: 1,
                },
                method: {"$first": "$method"}
            }
        },
        {
            $match: {
                count: 1
            }
        }
    ]);
}

module.exports = premiumSingleName;