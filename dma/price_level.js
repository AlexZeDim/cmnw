const auctions_db = require("../db/auctions_db");
const {connection} = require('mongoose');

async function price_level () {
    try {
        console.time(`DMA-${price_level.name}`);
        let priceArray = [];
        let SampleDev, prevSampleDev = 0;
        let docs = await auctions_db.distinct('unit_price', { "item.id": 152512, connected_realm_id: 1602}).lean();
        for (let i = 1; i < docs.length; i++) {
            //TODO should we start from 1 cause we ignore zeros?
            if (i > 1) prevSampleDev = SampleDev; else prevSampleDev = (1/docs.length*(Math.pow(docs[i],2)))-(Math.pow((1/docs.length*docs[i]),2));
            SampleDev = (1/docs.length*(Math.pow(docs[i],2)))-(Math.pow((1/docs.length*docs[i]),2));
            console.log(docs[i], prevSampleDev, SampleDev);
            if (prevSampleDev*2 < SampleDev) console.log(docs[i]); else priceArray.push(docs[i]);
            /***
             * If sampleDev is twice or x1.5 bigger then, oh my gosh, ban this shit from array
             * Price tick for chart is Pmax-Pmin/length and round to 0.25
             */
        }
        let roundNearQtr = (number) => {
            return (Math.round(number * 4) / 4).toFixed(2);
        };
        console.log(priceArray);
        console.log(roundNearQtr((priceArray[priceArray.length-1]-priceArray[0])/priceArray.length));
        connection.close();
        console.timeEnd(`DMA-${price_level.name}`);
    } catch (err) {
        console.log(err);
    }
}

price_level();