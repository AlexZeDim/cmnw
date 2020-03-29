const items_db = require("../../db/items_db");
const auctions_db = require("../../db/auctions_db");
const {connection} = require('mongoose');

async function indexItems () {
    try {
        console.time(`DMA-${indexItems.name}`);
        let commdty = await auctions_db.distinct('item.id', { unit_price: { $exists: true}}).lean();
        for (let i = 0; i < commdty.length; i++) {
            await items_db.findByIdAndUpdate(commdty[i], {is_commdty: true}, {new: true}).then(item => console.info(`U,${item._id},is_commdty`)).catch(e=>console.error(e))
        }
        let items = await auctions_db.distinct('item.id').lean();
        for (let i = 0; i < items.length; i++) {
            await items_db.findByIdAndUpdate(items[i], {is_auctionable: true}, {new: true}).then(item => console.info(`U,${item._id},is_auctionable`)).catch(e=>console.error(e))
        }
        connection.close();
        console.timeEnd(`DMA-${indexItems.name}`);
    } catch (err) {
        console.error(`${indexItems.name},${err}`);
    }
}

indexItems();