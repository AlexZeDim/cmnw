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
            },
            {
                key: "is_derivative",
                distinct: {},
                query: { $or:[ { asset_class:"VANILLA" }, { asset_class:"INDX" }, { asset_class:"PREMIUM" } ]},
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
            case 'is_derivative':
                ({key, distinct, query} = queries.find(({key}) => key === arg));
                items = await auctions_db.distinct('item.id', distinct).lean();
                for (let _id of items) {
                    await items_db.findByIdAndUpdate(_id, query, {new: true}).then(({_id}) => console.info(`U,${_id},${key}`)).catch(e=>console.error(e));
                }
                break;
            default:
                ({key, distinct, query} = queries.find(({key}) => key === arg));
                let cursor = await items_db.find(query).cursor();
                cursor.on('data', async item => {
                    cursor.pause();
                    item.is_derivative = true;
                    item.save();
                    cursor.resume();
                });
                break;
        }
        connection.close();
        console.timeEnd(`DMA-${indexItems.name}`);
    } catch (err) {
        console.error(`${indexItems.name},${err}`);
    }
}

indexItems(arg = 'is_auctionable');