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
        let sV = 0, prev_sV = 0;
        console.time('T')
        const p = await auctions_db.aggregate([
            {
                $match: { "item.id": item_id }
            },
            {
                $group: {
                    _id: {
                        connected_realm_id: "$connected_realm_id",
                        latest_timestamp: { $max: "$last_modified" },
                    },
                    price: { $addToSet: "$unit_price" },
                }
            },
            {
                $unwind: "$price"
            },
            {
                $group: {
                    _id: null,
                    price: { $addToSet: "$price" }
                }
            }
        ]).then(data => {
            return data[0].price
        })
        console.log(p.sort((a, b) => a - b))
        console.timeEnd('T')
        /**
         * IDEA there is special Mongo operator called $facet
         * IDEA and $bucket, we should take a look at this
         */
/*        const time_and_prices = await auctions_db.aggregate([
            {
                $match: { "item.id": item_id }
            },
            {
                $group: {
                    _id: "$connected_realm_id",
                    latest_timestamp: { $max: "$last_modified" },
                    price: { $addToSet: "$unit_price" },
                }
            },
            {
                $unwind: "$price"
            },
            {
                $sort: { price: 1 }
            }
        ]).exec()
        console.log(time_and_prices);*/
        /** Data is already sorted by price ascending */
        const L = time_and_prices.length;
        /** Sample Variance algorithm */
        for (let i = 1; i < L; i++) {
            /** Every unique Realm value addToSet */
            realmsSet.add(time_and_prices[i]._id)
            /**
             * We skip the real first value, because it could be too low
             * The second, first value is ignored
             */
            if (time_and_prices[i-1]) {
                /** sV becomes previous sV */
                prev_sV = sV;

                if (prev_sV * 1.5 < sV) {
                    break;
                }
            }
            /**
             * 1 / 100 * (50 ^ 2) - ( 1 / 100 * 50) ^ 2
             * @type {number}
             */
            sV = ( 1 / L * (Math.pow(time_and_prices[i].price,2))) - (Math.pow((1 / L * time_and_prices[i].price),2));
            /** Push every price to array of prices */
            priceArray.push(time_and_prices[i].price);
        }
        let floor = Math.floor(priceArray[0]);
        let cap = Math.round(priceArray[priceArray.length-1]);
        const price_range = cap - floor;
        /** Step represent 2.5% for each cluster */
        let step = price_range / 40;
        /**
         * @param start {Number}
         * @param stop {Number}
         * @param step {Number}
         * @returns {*[]}
         */
        const range = (start, stop, step = 1) => Array(Math.ceil((stop + step - start) / step)).fill(start).map((x, y) => parseFloat((x + y * step).toFixed(4)));
        /** Create xAxis and yAxis */
        let priceRange_array = await range(floor, cap, step);
        let realmsArray = Array.from(realmsSet);
        /** Create empty array ob objects chart */
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

        /** Round price to step */
        if (step < 1) {
            round = (number, precision = .5) => parseFloat((Math.round(number * (1 / precision)) / (1 / precision) ).toFixed(2));
        } else {
            round = (number, precision = 5) => Math.round(number / precision) * precision;
        }

        for (let order of orders) {
            /** Define coordinates */
            let x, y = 0;
            /** xAxis */
            x = realmsArray.map(Number).indexOf(+order.connected_realm_id);
            /** yAxis */
            if (priceRange_array.indexOf(round(order.unit_price, step)) === -1) {
                /** If price rounded is lower then floor, yAxis = 0 */
                if (round(order.unit_price, step) < floor) {
                    y = 0;
                }
                /** If price rounded is higher then cap, yAxis = max */
                if (round(order.unit_price, step) > cap) {
                    y = priceRange_array.length-1;
                }
            } else {
                y = priceRange_array.indexOf(round(order.unit_price, step));
            }
            /** find element in chartArray by its xAxis and yAxis coordinates and add values */
            chartArray.filter((el) => {
                if (el.x === x && el.y === y) {
                    el.value = el.value+order.quantity;
                    el.oi = el.oi+(order.unit_price*order.quantity);
                    el.orders = el.orders+1
                }
            });
        }
        return { price_range: priceRange_array, realms: realmsArray, dataset: chartArray }
    } catch (error) {
        console.error(error)
    }
}

module.exports = auctionsCrossRealmData;