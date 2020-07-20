/**
 * Model importing
 */

const auctions_db = require("../db/auctions_db");


/**
 * TODO rename unit_price OR buyout to price
 * TODO new formula for range, +5%
 * @param item_id
 * @returns {Promise<*>}
 */

async function auctionsCrossRealmData (item_id = 168487) {
    try {
        let chartArray = [];
        let priceArray = [];
        let realmsSet = new Set();
        let round;
        let sampleVariable = 0, sampleVariable_prev = 0;
        const time_and_prices = await auctions_db.aggregate([
            {
                $match: { "item.id": item_id }
            },
            {
                $group: {
                    _id: "$connected_realm_id",
                    latest_timestamp: {$max:"$last_modified"},
                    price: {$addToSet: "$unit_price"},
                }
            },
            {
                $unwind: "$price"
            },
            {
                $sort: { price: 1 }
            }
        ]).exec()
        for (let i = 1; i < time_and_prices.length; i++) {
            realmsSet.add(time_and_prices[i]._id)
            if (i > 1) sampleVariable_prev = sampleVariable; else sampleVariable_prev = (1 / time_and_prices.length*(Math.pow(time_and_prices[i].price,2)))-(Math.pow((1 / time_and_prices.length*time_and_prices[i].price),2));
            sampleVariable = (1 / time_and_prices.length*(Math.pow(time_and_prices[i].price,2)))-(Math.pow((1 / time_and_prices.length*time_and_prices[i].price),2));
            if (sampleVariable_prev * 1.5 < sampleVariable) break; else priceArray.push(time_and_prices[i].price);
        }
        let start = Math.floor(priceArray[0]);
        let stop = Math.round(priceArray[priceArray.length-1]);
        const price_range = stop-start;
        let step = 0;
        switch (true) {
            case (price_range <= 1.5):
                step = 0.1;
                break;
            case (price_range <= 7.5):
                step = 0.25;
                break;
            case (price_range <= 15):
                step = 0.5;
                break;
            case (price_range <= 30):
                step = 1;
                break;
            case (price_range <= 42.5):
                step = 2.5;
                break;
            case (price_range <= 75):
                step = 2.5;
                break;
            case (price_range <= 150):
                step = 10;
                break;
            default:
                step = 1;
        }
        if (step < 1) {
            round = (number, nearest = .5) => parseFloat((Math.round(number * (1/nearest)) / (1/nearest) ).toFixed(2));
        } else {
            round = (number, precision = 5) => Math.round(number/precision)*precision;
        }
        const range = (start, stop, step = 1) => Array(Math.ceil((stop + step - start) / step)).fill(start).map((x, y) => x + y * step);
        let priceRange_array = await range(round(start,step), round(stop,step), step);
        let realmsArray = Array.from(realmsSet);

        for (let x_ = 0; x_ < realmsArray.length; x_++) {
            for (let y_ = 0; y_ < priceRange_array.length; y_++) {
                chartArray.push({x: x_, y: y_, value: 0, oi: 0, orders: 0});
            }
        }

        const orders = await auctions_db.aggregate([
            {
                $match: { "item.id": item_id }
            },
            {
                $group: {
                    _id: {
                        connected_realm_id: "$connected_realm_id",
                        last_modified: { $max: "$last_modified" },
                    },
                    data: { $push: "$$ROOT" },
                }
            },
            {
                $unwind: "$data"
            },
            {
                $replaceWith: "$data"
            },
            {
                $sort: { unit_price: 1 }
            }
        ]).exec()

        for (let order of orders) {
            let x, y = 0;
            x = realmsArray.map(Number).indexOf(+order.connected_realm_id);
            if (priceRange_array.indexOf(round(order.unit_price, step)) === -1) {
                if (round(order.unit_price, step) < start) {y = 0;}
                if (round(order.unit_price, step) > stop) {y = priceRange_array.length-1;}
            } else {
                y = priceRange_array.indexOf(round(order.unit_price, step));
            }
            chartArray.filter((el) => {
                if (el.x === x && el.y === y) {
                    el.value = el.value+order.quantity;
                    el.oi = el.oi+(order.unit_price*order.quantity);
                    el.orders = el.orders+1
                }
            });
        }
        if (step < 1) {
            priceRange_array = priceRange_array.map(p => p.toFixed(2));
        }
        return { price_range: priceRange_array, realms: realmsArray, dataset: chartArray }
    } catch (error) {
        console.error(error)
    }
}

module.exports = auctionsCrossRealmData;