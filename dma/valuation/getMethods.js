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
                $project: {
                    quantity: 0,
                }
            },
        ]);
    } catch (err) {
        console.error(err);
    }
}

module.exports = getMethods;