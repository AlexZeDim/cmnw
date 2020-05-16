const pricing_methods = require("../../../db/pricing_methods_db");

async function premiumSingleName (item_id) {
    return pricing_methods.aggregate([
        {
            $match: {
                reagent_items: {$elemMatch: {_id: item_id}},
            }
        },
        {
            $addFields: { item_id_v: ["$item_id", "$alliance_item_id", "$horde_item_id"]}
        },
        {
            $unwind: "$item_id_v"
        },
        {
            $match: {
                item_id_v: {"$ne":null},
            }
        },
        {
            $lookup: {
                from: "items",
                localField: "item_id_v",
                foreignField: "_id",
                as: "item"
            }
        },
        {
            $match: {
                "item.is_auctionable": true
            }
        },
        {
            $group: {
                _id: "item_id_v",
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
            $unwind: "$reagent_items"
        },
        {
            $group: {
                _id: {
                    reagent_item_id: "$reagent_items._id",
                    v_class: "$reagent_items.v_class",
                    recipe_id: "$_id",
                    item_id: "$item_id_v"
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
                _id: {
                    recipe_id: "$_id.recipe_id",
                    item_id: "$_id.item_id"
                },
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
        },
        {
            $project: {
                first: { $arrayElemAt: [ "$method", 0 ] },
            }
        },
        {
            $replaceWith: "$first"
        },
        {
            $addFields: {
                "item_id": "$item_id_v"
            }
        },
        {
            $project: {
                "reagent_items": 0,
                "item_id_v": 0
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
            $addFields: {
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
    ]);
}

module.exports = premiumSingleName;