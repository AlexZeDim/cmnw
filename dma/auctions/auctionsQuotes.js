const auctions_db = require("../../db/auctions_db");

async function auctionsQuotes (item_id = 168487, connected_realm_id = 1602) {
    try {
        const {lastModified} = await auctions_db.findOne({ "item.id": item_id, connected_realm_id: connected_realm_id}).sort({lastModified: -1});
        let auction_data = await auctions_db.aggregate([
            {
                $match: {
                    lastModified: lastModified,
                    "item.id": item_id,
                    connected_realm_id: connected_realm_id,
                }
            },
            {
                $project: {
                    id: "$id",
                    quantity: "$quantity",
                    price: { $ifNull: [ "$buyout", { $ifNull: [ "$bid", "$unit_price" ] } ] },
                }
            },
            {
                $group: {
                    _id: "$price",
                    quantity: {$sum: "$quantity"},
                    open_interest: {$sum: { $multiply: [ "$price", "$quantity" ] }},
                    orders: {$addToSet: "$id"},
                }
            },
            {
                $sort : { "_id": 1 }
            }
        ]).then( r => r);
        let market = {
            otc: 0,
            price: 0,
            price_size: 0,
            quantity:  0,
            open_interest: 0,
            orders: 0,
            timestamp: lastModified,
        };
        for (let i = 0; i < auction_data.length; i++) {
            let {_id, quantity, open_interest, orders} = auction_data[i];
            if (i === 0) {
                market.otc = parseFloat((_id*0.95).toFixed(2));
                market.price = _id;
            }
            if (quantity >= 200 && market.quantity === 0) {
                market.price_size = _id;
            }
            if (_id > 2 && i > Math.round(auction_data.length/2) && Math.pow(auction_data[i-1]._id, 1.25) < _id) break;
            market.quantity += quantity;
            market.open_interest += parseFloat(open_interest.toFixed(2));
            market.orders += orders.length;

        }
        return [auction_data, market]
    } catch (error) {
        console.error(error)
    }
}

module.exports = auctionsQuotes;