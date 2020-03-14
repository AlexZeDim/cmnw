const auctions_db = require("../db/auctions_db");

async function price_level () {
    try {
        let counter = 0;
        let docs = await auctions_db.distinct('unit_price', { "item.id": 152512, connected_realm_id: 1602}).lean();
        console.log(docs);
        for (let i = 0; i < docs.length; i++) {
            console.log(docs[i],(1/docs.length*(docs[i]*docs[i]))-((1/docs.length*docs[i])*(1/docs.length*docs[i])));
            /*counter += docs[i];
            if (i > Math.round(docs.length*0.85)-1) {
                if ((counter-docs[i])/docs[i-1] > (counter/docs[i])) {
                    console.info(`Tail strike: ${docs[i]} previous: ${docs[i-1]}`)
                } else {
                    priceArray.push(docs[i])
                }
            } else {
                priceArray.push(docs[i])
            }*/
        }
    } catch (err) {
        console.log(err);
    }
}

price_level();