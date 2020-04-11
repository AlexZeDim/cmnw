const items_db = require("../../db/items_db");
const pricing_db = require("../../db/pricing_db");
const auctions_db = require("../../db/auctions_db");

/**
 *
 * @param reagents {Array}
 * @param quantity {Array}
 * @returns {Promise<void>}
 */

async function indexReagents (reagents, quantity) {
    try {
        console.time(indexReagents.name);
        if (reagents.length !== quantity.length) {
            new Error('shit')
        }
        let reagents_items = await Promise.all(reagents.map( async (id, i) => {
            let item = await items_db.findById(id).lean();
            Object.assign(item, {quantity: quantity[i]});
            return item
        }));
        let assetClass = new Map([
            ['CONST', 0],
            ['COMMDTY', 1],
            ['INDX', 2],
            ['VANILLA', 3],
            ['PREMIUM', 4],
        ]);
        reagents_items.sort((a, b) => assetClass.get(a.asset_class) - assetClass.get(b.asset_class));
        let quene_cost = 0;
        let premium_count = 0;
        for (let item of reagents_items) {
            let pricing_method = {};
            let {_id, name, ticker, quantity, asset_class, sell_price} = item;
            pricing_method.id = _id;
            (ticker) ? (pricing_method.name = ticker) : (pricing_method.name = name.en_GB);
            pricing_method.quality = quantity;
            pricing_method.asset_class = asset_class;
            switch (asset_class) {
                case 'CONST':
                    pricing_method.price = sell_price;
                    pricing_method.value = parseFloat((sell_price * quantity).toFixed(2));
                    quene_cost += parseFloat((sell_price * quantity).toFixed(2));
                    console.log(pricing_method);
                    break;
                case 'COMMDTY':
                    let {lastModified} = await auctions_db.findOne({ "item.id": _id, connected_realm_id: 1602}).sort({lastModified: -1});
                    await auctions_db.aggregate([
                        {
                            $match: {
                                lastModified: lastModified,
                                "item.id": _id,
                                connected_realm_id: 1602,
                            }
                        },
                        {
                            $project: {
                                _id: "$lastModified",
                                id: "$id",
                                quantity: "$quantity",
                                price: {$ifNull: ["$buyout", {$ifNull: ["$bid", "$unit_price"]}]},
                            }
                        },
                        {
                            $group: {
                                _id: "$_id",
                                price: {$min: "$price"},
                                price_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", {$min: "$price"}]}},
                            }
                        }
                    ]).then(([{price, price_size}]) => {
                        if (price_size) {
                            pricing_method.price = price_size;
                            pricing_method.value = parseFloat((price_size * quantity).toFixed(2));
                            quene_cost += parseFloat((price_size * quantity).toFixed(2));
                        } else {
                            pricing_method.price = price;
                            pricing_method.value = parseFloat((price * quantity).toFixed(2));
                            quene_cost += parseFloat((price * quantity).toFixed(2));
                        }
                    });
                    break;
                case 'INDX':
                    pricing_method.price = 0;
                    pricing_method.value = 0;
                    quene_cost += 0;
                    console.log(pricing_method);
                    break;
                case 'VANILLA':
                    pricing_method.price = 0;
                    pricing_method.value = 0;
                    quene_cost += 0;
                    console.log(pricing_method);
                    break;
                case 'PREMIUM':
                    if (premium_count === 0) {
                        premium_count += 1;
                    } else {
                        //SECOND
                        console.log(quene_cost);
                    }
                    pricing_method.price = 0;
                    pricing_method.value = 0;
                    console.log(pricing_method);
                    break;
                default:
                    pricing_method.price = 0;
                    pricing_method.value = 0;
                    console.log(pricing_method);
            }
        }
        console.timeEnd(indexReagents.name);
    } catch (err) {
        console.log(err);
    }
}

indexReagents([166846, 167562, 160399, 160400],[5,8,5,3]);