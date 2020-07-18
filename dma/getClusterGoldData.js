/**
 * Model importing
 */

const gold_db = require("../db/golds_db");

/**
 * @param connected_realm_id
 * @returns {Promise<{timestamps: *, price_range: *, dataset: []}>}
 */

async function getClusterGoldData (connected_realm_id = 1602) {
    try {
        let chartArray = [];
        let priceArray = [];
        let round;
        let sampleVariable = 0, sampleVariable_prev = 0;
        let [quotes, timestamp] = await Promise.all([
            gold_db.distinct('price', { status: "Online", connected_realm_id: connected_realm_id }).lean(),
            gold_db.distinct('last_modified', { status: "Online", connected_realm_id: connected_realm_id }).lean()
        ]);
        if (quotes.length && timestamp.length) {
            for (let i = 1; i < quotes.length; i++) {
                if (i > 1) sampleVariable_prev = sampleVariable; else sampleVariable_prev = (1 / quotes.length*(Math.pow(quotes[i],2)))-(Math.pow((1 / quotes.length*quotes[i]),2));
                sampleVariable = (1 / quotes.length*(Math.pow(quotes[i],2)))-(Math.pow((1 / quotes.length*quotes[i]),2));
                if (sampleVariable_prev * 1.5 < sampleVariable) break; else priceArray.push(quotes[i]);
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
                    step = 5;
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
            for (let x_ = 0; x_ < timestamp.length; x_++) {
                for (let y_ = 0; y_ < priceRange_array.length; y_++) {
                    chartArray.push({x: x_, y: y_, value: 0, oi: 0, orders: 0});
                }
            }
            await gold_db.find({ connected_realm_id: connected_realm_id }).lean().cursor({batchSize: 20}).eachAsync(async ({price, quantity, last_modified}) => {
                let x, y = 0;
                x = timestamp.map(Number).indexOf(+last_modified);
                if (priceRange_array.indexOf(round(price, step)) === -1) {
                    if (round(price, step) < start) {y = 0;}
                    if (round(price, step) > stop) {y = priceRange_array.length-1;}
                } else {
                    y = priceRange_array.indexOf(round(price, step));
                }
                chartArray.filter((el) => {
                    if (el.x === x && el.y === y) {
                        el.value = el.value+quantity;
                        el.oi = el.oi+(price*quantity);
                        el.orders = el.orders+1
                    }
                });
            }, { parallel: 20 })
            if (step < 1) {
                priceRange_array = priceRange_array.map(p => p.toFixed(2));
            }
            timestamp = timestamp.map(ts => ts.toLocaleString('en-GB'));
            return { price_range: priceRange_array, timestamps: timestamp, dataset: chartArray }
        } else {
            return void 0
        }
    } catch (err) {
        console.log(err);
    }
}

module.exports = getClusterGoldData;