const pricing_methods = require("../../db/pricing_methods_db");

async function getPricingMethods (id = 15389, synthetic = false) {
    try {
        let query = [{type: 'primary'}];
        if (synthetic) {
            query.push({type: 'derivative'})
        }
        return await pricing_methods.aggregate([
            {
                $match: {
                    $or: [
                        {
                            alliance_item_id: id,
                            $or: query
                        },
                        {
                            horde_item_id: id,
                            $or: query
                        },
                        {
                            item_id: id,
                            $or: query
                        }
                    ]
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
                    localField: "reagents._id",
                    foreignField: "_id",
                    as: "reagent_items"
                }
            },
            {
                $project: {
                    _id: 1,
                    media: 1,
                    name: 1,
                    description: 1,
                    horde_item_id: 1,
                    alliance_item_id: 1,
                    item_id: 1,
                    item_quantity: 1,
                    spell_id: 1,
                    recipe_id: 1,
                    profession: 1,
                    expansion: 1,
                    rank: 1,
                    type: 1,
                    createdBy: 1,
                    updatedBy: 1,
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
    } catch (err) {
        console.error(err);
    }
}

module.exports = getPricingMethods;