const items_db = require("../../db/items_db");
const auctions_db = require("../../db/auctions_db");
const {connection} = require('mongoose');

async function indexItems (arg) {
    try {
        console.time(`DMA-${indexItems.name}`);
        //TODO Map for of and CASE SWITCH
        let queries = [
            {
                key: "is_commdty",
                distinct: { unit_price: { $exists: true}},
                query: {is_commdty: true},
            },
            {
                key: "is_auctionable",
                distinct: {},
                query: {is_auctionable: true},
            }
        ];
        let items, key, distinct, query;
        switch (arg) {
            case 'is_commdty':
                ({key, distinct, query} = queries.find(({key}) => key === arg));
                items = await auctions_db.distinct('item.id', distinct).lean();
                for (let _id of items) {
                    await items_db.findByIdAndUpdate(_id, query, {new: true}).then(({_id}) => console.info(`U,${_id},${key}`)).catch(e=>console.error(e));
                }
                break;
            case 'is_auctionable':
                ({key, distinct, query} = queries.find(({key}) => key === arg));
                items = await auctions_db.distinct('item.id', distinct).lean();
                for (let _id of items) {
                    await items_db.findByIdAndUpdate(_id, query, {new: true}).then(({_id}) => console.info(`U,${_id},${key}`)).catch(e=>console.error(e));
                }
                break;
            default:
                for (let {key, distinct, query} of queries) {
                    let items = await auctions_db.distinct('item.id', distinct).lean();
                    for (let _id of items) {
                        await items_db.findByIdAndUpdate(_id, query, {new: true}).then(({_id}) => console.info(`U,${_id},${key}`)).catch(e=>console.error(e));
                    }
                }
                break;
        }
        connection.close();
        console.timeEnd(`DMA-${indexItems.name}`);
    } catch (err) {
        console.error(`${indexItems.name},${err}`);
    }
}

indexItems(arg = 'is_commdty');