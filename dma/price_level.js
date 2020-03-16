const auctions_db = require("../db/auctions_db");
const {connection} = require('mongoose');

async function price_level () {
    try {
        console.time(`DMA-${price_level.name}`);
        let chartArray = [];
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
            if (sampleVariable_prev*3 < sampleVariable) break; else priceArray.push(docs[i]);
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

        for (let x_ = 0; x_ < ts.length; x_++) {
            for (let y_ = 0; y_ < priceRange_array.length; y_++) {
                chartArray.push([x_,y_,0]);
            }
        }
        console.log(chartArray);

        let cursor = await auctions_db.find({ "item.id": 168487, connected_realm_id: 1602}).lean().cursor({batchSize: 20});
        for (let order = await cursor.next(); order != null; order = await cursor.next()) {
            //console.log(order)
            let x, y = 0;
            //TODO this one is for timestamp
            x = ts.map(Number).indexOf(+order.lastModified);
            //TODO this one is for index price
            if (priceRange_array.indexOf(roundNearQtr(order.unit_price)) === -1) {
                if (roundNearQtr(order.unit_price) < start) {y = 0;} //TODO to min (priceRange_array[0] index)
                if (roundNearQtr(order.unit_price) > stop) {y = priceRange_array.length-1;}//TODO to max (priceRange_array[priceRange_array.length-1])
            } else {
                y = priceRange_array.indexOf(roundNearQtr(order.unit_price)); //TODO price index
            }
            console.log(chartArray[priceRange_array.length*x+y], `+${order.quantity}`);
            chartArray[priceRange_array.length*x+y][2] = chartArray[priceRange_array.length*x+y][2]+order.quantity;
            console.log(chartArray[priceRange_array.length*x+y]);
            //console.log(`[${x},${y},${order.quantity}] or ${priceRange_array.length*x+y} +${order.quantity}`)
        }
        console.log(chartArray);
        connection.close();
        console.timeEnd(`DMA-${price_level.name}`);
    } catch (err) {
        console.log(err);
    }
}

price_level();