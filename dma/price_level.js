const auctions_db = require("../db/auctions_db");
const {connection} = require('mongoose');

async function price_level () {
    try {
        console.time(`DMA-${price_level.name}`);
        let priceArray = [];
        let sampleVariable, sampleVariable_prev = 0;
        let docs = await auctions_db.distinct('unit_price', { "item.id": 168487, connected_realm_id: 1602}).lean();
        let ts = await auctions_db.distinct('lastModified', { "item.id": 168487, connected_realm_id: 1602}).lean();
        console.log(ts);
        for (let i = 1; i < docs.length; i++) {
            //TODO should we start from 1 cause we ignore zeros?
            if (i > 1) sampleVariable_prev = sampleVariable; else sampleVariable_prev = (1/docs.length*(Math.pow(docs[i],2)))-(Math.pow((1/docs.length*docs[i]),2));
            sampleVariable = (1/docs.length*(Math.pow(docs[i],2)))-(Math.pow((1/docs.length*docs[i]),2));
            //console.log(docs[i], sampleVariable_prev, sampleVariable);
            if (sampleVariable_prev*2 < sampleVariable) console.log(docs[i]); else priceArray.push(docs[i]);
            /***
             * If sampleDev is twice or x1.5 bigger then, oh my gosh, ban this shit from array
             * Price tick for chart is Pmax-Pmin/length and round to 0.25
             */
        }
        //TODO round to 0.25 (4) or 0.5 (2)
        let roundNearQtr = (number) => parseFloat((Math.round(number * 2) / 2).toFixed(2));

        console.log(priceArray);

        let start = (roundNearQtr(priceArray[0]));
        let stop = (roundNearQtr(priceArray[priceArray.length-1]));
        let step = (roundNearQtr((priceArray[priceArray.length-1]-priceArray[0])/priceArray.length));

        console.log(roundNearQtr(priceArray[0]));
        console.log(roundNearQtr(priceArray[priceArray.length-1]));
        console.log(roundNearQtr((priceArray[priceArray.length-1]-priceArray[0])/priceArray.length));

        const range = (start, stop, step = 1) => Array(Math.ceil((stop + step - start) / step)).fill(start).map((x, y) => x + y * step);
        let priceRange_array = await range(start, stop, step);
        console.log(priceRange_array);
        let cursor = await auctions_db.find({ "item.id": 168487, connected_realm_id: 1602}).lean().cursor({batchSize: 20});
        for (let order = await cursor.next(); order != null; order = await cursor.next()) {
            //console.log(order)
            //TODO this one is for timestamp
            console.log(ts.map(Number).indexOf(+order.lastModified));
            //TODO this one is for index price
            if (priceRange_array.indexOf(roundNearQtr(order.unit_price)) === -1) {
                if (roundNearQtr(order.unit_price) < start) console.log(roundNearQtr(order.unit_price)); //TODO to min (priceRange_array[0] index)
                if (roundNearQtr(order.unit_price) > stop) console.log(roundNearQtr(order.unit_price)); //TODO to max (priceRange_array[priceRange_array.length-1])
            } else {
                console.log(priceRange_array.indexOf(roundNearQtr(order.unit_price))); //TODO price index
            }
        }
        connection.close();
        console.timeEnd(`DMA-${price_level.name}`);
    } catch (err) {
        console.log(err);
    }
}

price_level();