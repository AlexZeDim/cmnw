const auctions_db = require("../db/auctions_db");

async function price_level () {
    try {
        let priceArray = [];
        let SampleDev, prevSampleDev = 0;
        let docs = await auctions_db.distinct('unit_price', { "item.id": 152512}).lean();
        console.log(docs);
        for (let i = 0; i < docs.length; i++) {
            if (i > 0) prevSampleDev = SampleDev; else prevSampleDev = (1/docs.length*(Math.pow(docs[i],2)))-(Math.pow((1/docs.length*docs[i]),2));
            SampleDev = (1/docs.length*(Math.pow(docs[i],2)))-(Math.pow((1/docs.length*docs[i]),2));
            if (prevSampleDev*1.5 < SampleDev) console.log(docs[i]); else priceArray.push(docs[i]);
            /***
             * If sampleDev is twice or x1.5 biggerm then oh my gosh, ban this shit from array
             * Price tick for chart is Pmax-Pmin/length and round to 0.25
             */
        }
        let roundNearQtr = (number) => {
            return (Math.round(number * 4) / 4).toFixed(2);
        };
        console.log(roundNearQtr((priceArray[priceArray.length-1]-priceArray[0])/priceArray.length));
    } catch (err) {
        console.log(err);
    }
}

price_level();