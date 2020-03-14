const auctions_db = require("../db/auctions_db");

async function price_level () {
    try {
        let priceArray = [];
        let docs = await auctions_db.distinct('unit_price', { "item.id": 152512}).lean();
        console.log(docs);
        for (let i = 0; i < docs.length; i++) {
            if (docs[i-1] !== undefined) console.log(docs[i]/docs[i-1])
        }
        console.log(priceArray)
    } catch (err) {
        console.log(err);
    }
}

price_level();