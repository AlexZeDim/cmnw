/**
 * Model importing
 */

const auctions_db = require("../db/auctions_db");

/**
 * @param item_id
 * @param connected_realm_id
 * @returns {Promise<{timestamps: *, price_range: *, dataset: []}>}
 */

async function getClusterChartData (item_id = 152510, connected_realm_id = 1602) {
    try {
        let chartArray = [];
        /** Request all unique values (price x timestamp) for item */
        let [quotes, timestamp] = await Promise.all([
            auctions_db.distinct('unit_price', { "item.id": item_id, connected_realm_id: connected_realm_id}).lean(),
            auctions_db.distinct('last_modified', { "item.id": item_id, connected_realm_id: connected_realm_id}).lean()
        ]);
        /** Check for responce */
        if (quotes.length && timestamp.length) {
            /** Floor as 2nd value, Cap as .95% */
            const L = quotes.length;
            const ninety_percent = Math.floor(L * 0.90)
            let floor = Math.floor(quotes[0]);
            let cap = Math.round(quotes[ninety_percent]);
            /** Define range */
            const price_range = cap - floor;
            /** Step represent 5% for each cluster */
            let step = price_range / 20;
            /** Generate range and round() */
            /**
             * @param start
             * @param stop
             * @param step
             * @returns {number[]}
             */
            const range = (start, stop, step = 1) => Array(Math.ceil((stop + step - start) / step)).fill(start).map((x, y) => parseFloat((x + y * step).toFixed(4)));
            let priceRange_array = await range(floor, cap, step);
            for (let x_ = 0; x_ < timestamp.length; x_++) {
                for (let y_ = 0; y_ < priceRange_array.length; y_++) {
                    chartArray.push({x: x_, y: y_, value: 0, oi: 0, orders: 0});
                }
            }
            let cursor = await auctions_db.find({ "item.id": item_id, connected_realm_id: connected_realm_id }).lean().cursor({batchSize: 20});
            for (let order = await cursor.next(); order != null; order = await cursor.next()) {
                let x, y = 0;
                x = timestamp.map(Number).indexOf(+order.last_modified);
                const corrected_price = priceRange_array.reduce((prev, curr) => Math.abs(curr - order.unit_price) < Math.abs(prev - order.unit_price) ? curr : prev)
                if (priceRange_array.indexOf(corrected_price) === -1) {
                    if (corrected_price < floor) {y = 0;}
                    if (corrected_price > cap) {y = priceRange_array.length-1;}
                } else {
                    y = priceRange_array.indexOf(corrected_price);
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
            timestamp = timestamp.map(ts => ts*1000);
            return { price_range: priceRange_array, timestamps: timestamp, dataset: chartArray }
        } else {
            return void 0
        }
    } catch (err) {
        console.log(err);
    }
}

module.exports = getClusterChartData;