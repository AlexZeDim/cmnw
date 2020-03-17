const auctions_db = require("../db/auctions_db");

async function price_level () {
    try {
        let chartArray = [];
        let priceArray = [];
        let round;
        let sampleVariable, sampleVariable_prev = 0;
        let quotes = await auctions_db.distinct('unit_price', { "item.id": 152510, connected_realm_id: 1602}).lean();
        let timestamp = await auctions_db.distinct('lastModified', { "item.id": 152510, connected_realm_id: 1602}).lean();
        for (let i = 1; i < quotes.length; i++) {
            if (i > 1) sampleVariable_prev = sampleVariable; else sampleVariable_prev = (1/quotes.length*(Math.pow(quotes[i],2)))-(Math.pow((1/quotes.length*quotes[i]),2));
            sampleVariable = (1/quotes.length*(Math.pow(quotes[i],2)))-(Math.pow((1/quotes.length*quotes[i]),2));
            if (sampleVariable_prev*3 < sampleVariable) break; else priceArray.push(quotes[i]);
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
                chartArray.push([x_,y_,0]);
            }
        }
        let cursor = await auctions_db.find({ "item.id": 152510, connected_realm_id: 1602}).lean().cursor({batchSize: 20});
        for (let order = await cursor.next(); order != null; order = await cursor.next()) {
            let x, y = 0;
            x = timestamp.map(Number).indexOf(+order.lastModified);
            if (priceRange_array.indexOf(round(order.unit_price, step)) === -1) {
                if (round(order.unit_price, step) < start) {y = 0;}
                if (round(order.unit_price, step) > stop) {y = priceRange_array.length-1;}
            } else {
                y = priceRange_array.indexOf(round(order.unit_price, step));
            }
            chartArray[priceRange_array.length*x+y][2] = chartArray[priceRange_array.length*x+y][2]+order.quantity;
        }
        console.log(priceRange_array);
        console.log(timestamp);
        console.log(chartArray);
        return {price_range: priceRange_array, timestamps: timestamp, chart: chartArray}
    } catch (err) {
        console.log(err);
    }
}

module.exports = price_level;