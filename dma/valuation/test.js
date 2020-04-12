

/*const battleNetWrapper = require('battlenet-api-wrapper');
const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';*/

const items_db = require("../../db/items_db");
const pricing_db = require("../../db/pricing_db");

const {connection} = require('mongoose');

async function test () {
    try {

        /**
         * IDEA test
         */

        let evaItems = await items_db.find({asset_class: "VANILLA", ticker: "FOOD.CRIT"}).lean().limit(5);
        for (let evaItem of evaItems) {
            let evaItem_valuations = await pricing_db.aggregate([
                {
                    $match: {
                        item_id: evaItem._id
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
                        quantity: 1
                    }
                },
                {
                    $unwind: "$reagents_items"
                },
                {
                    $group: { _id: {spell_id: "$spell_id", asset_class: "$reagents_items.asset_class"}, count: { $sum: 1 }}
                },
                {
                    $project: {
                        _id: "$_id.spell_id",
                        asset_class: "$_id.asset_class",
                        count: "$count"
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        evaluate_class: {$addToSet: {asset_class: "$asset_class", count: "$count"}},
                    }
                }
            ]);
            console.log(evaItem._id, evaItem_valuations[0]);

            //console.log(evaItem_valuations[0].reagents_items);
/*            for (let {reagents} of evaItem_valuations) {
                let reagents_items = await Promise.all(reagents.map( async (reagent_id) => {
                    return await items_db.findById(reagent_id).lean();
                }));
                console.log(evaItem._id, reagents_items);
            }*/
        }
        connection.close();
    } catch (err) {
        console.log(err);
    }
}

test();