const items_db = require("../../db/items_db");
const valuations_db = require("../../db/valuations_db");
const auctions_db = require("../../db/auctions_db");
const {connection} = require('mongoose');

//TODO check asset_class for valuations
//TODO do it recursive?

async function getValuation (item_id = 169451, connected_realm_id = 1602) {
    try {
        console.time(`DMA-${getValuation.name}`);
        const {lastModified} = await auctions_db.findOne({ "item.id": item_id, connected_realm_id: connected_realm_id}).sort({lastModified: -1});
        /**
         * TODO if YLD then rank max else ;;;;;
         * TODO if rank $exist then rank $max
         * TODO find by asset class-etc? distinct?
         *
         * FIXME this shit should guarantee
         */
        let [{reagents, quantity}] = await valuations_db.find({item_id: item_id, rank: 3}).lean();
        if (reagents.length === quantity.length) {
            //TODO check if reagent demands evaluation as array

            //TODO maybe all we need is right aggregation?
            let reagentsArray = reagents.map((id, i) => items_db.findById(id).lean().then(({_id, name, ticker, asset_class, derivative, sell_price}) => {
                let row = {};
                row.id = _id;
                (ticker) ? (row.name = ticker) : (row.name = name.en_GB);
                row.quality = quantity[i];
                row.asset_class = asset_class;
                if (derivative !== 'CONST') {
                    return auctions_db.aggregate([
                        {
                            $match: {
                                lastModified: lastModified,
                                "item.id": _id,
                                connected_realm_id: connected_realm_id,
                            }
                        },
                        {
                            $project: {
                                _id: "$lastModified",
                                id: "$id",
                                quantity: "$quantity",
                                price: { $ifNull: [ "$buyout", { $ifNull: [ "$bid", "$unit_price" ] } ] },
                            }
                        },
                        {
                            $group: {
                                _id: "$_id",
                                min: {$min: "$price"},
                                min_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", {$min: "$price"}]}},
                            }
                        }
                    ]).then(([{min, min_size}]) => {
                        if (min_size) {
                            row.price = min_size;
                            row.value = parseFloat((min_size * quantity[i]).toFixed(2))
                        } else {
                            row.price = min;
                            row.value = parseFloat((min * quantity[i]).toFixed(2))
                        }
                        return row;
                    })
                } else {
                    row.price = sell_price;
                    row.value = parseFloat((sell_price * quantity[i]).toFixed(2));
                    return row
                }
            }));
            let ok = await Promise.all(reagentsArray);
            return {evaluation: ok, valuation: ok.reduce((a, { value }) => a + value, 0)}
            //TODO if yes check market price
        }
        connection.close();
        console.timeEnd(`DMA-${getValuation.name}`);
    } catch (err) {
        console.error(`${getValuation.name},${err}`);
    }
}

getValuation();