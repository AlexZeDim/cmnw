const auctions_db = require("../db/auctions_db");

async function price_level () {
    try {
        let priceArray = [];
        let counter = 0;
        let docs = await auctions_db.distinct('unit_price', { "item.id": 152512}).lean();
        console.log(docs);
        for (let i = 0; i < docs.length; i++) {
            counter += docs[i];
            if (i > Math.round(docs.length*0.85)-1) {
                if ((counter-docs[i])/docs[i-1] > (counter/docs[i])) {
                    console.info(`Tail strike: ${docs[i]} previous: ${docs[i-1]}`)
                } else {
                    priceArray.push(docs[i])
                }
            } else {
                priceArray.push(docs[i])
            }
        }
        console.log(priceArray)
    } catch (err) {
        console.log(err);
    }
}

price_level();