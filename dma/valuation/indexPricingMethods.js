const pricing_methods = require("../../db/pricing_methods_db");
const {connection} = require('mongoose');

async function indexPricingMethods() {
    try {
        let cursor = await pricing_methods.aggregate([
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
        ]).cursor({batchSize: 1}).exec();
        cursor.on('data', async (pricing_method) => {
            cursor.pause();
            let method = await pricing_methods.findByIdAndUpdate(pricing_method._id, pricing_method);
            console.log(method);
            cursor.resume();
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