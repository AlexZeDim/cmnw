const pricing_methods = require("../../../db/pricing_methods_db");

async function premiumSingleName (item_id) {
    let test = await pricing_methods.aggregate([
        {
            $match: {
                reagent_items: { $elemMatch: { _id: item_id } }
            }
        },
        {
            $group: {
                _id: {
                    v_class: "$reagent_items.v_class",
                    recipe_id: "$_id"
                },
                data: { $push: '$$ROOT' }
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
                data: { "$first": "$data" }
            }
        },
        {
            $match: {
                count: 1
            }
        }
    ]);
    console.log(test);
}

module.exports = premiumSingleName;