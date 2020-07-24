/**
 * Connection with DB
 */

const {connect, connection} = require('mongoose');
require('dotenv').config();
connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () => console.log('Connected to database on ' + process.env.hostname));

/**
 * Model importing
 */

const items_db = require("../../db/items_db");
const auctions_db = require("../../db/auctions_db");
const pricing_methods_db = require("../../db/pricing_methods_db");

/**
 * IDEA build.yaml?
 * indexItems add is_auction, is_commdty and is_derivative properties to items
 * @param arg
 * @returns {Promise<void>}
 */

async function indexAssetClass (arg) {
    try {
        console.time(`DMA-${indexAssetClass.name}`);
        let queries = [
            {
                key: "is_commdty",
                distinct: { unit_price: { $exists: true}},
                query: { is_commdty: true },
            },
            {
                key: "is_auctionable",
                distinct: {},
                query: { is_auctionable: true },
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
                /** TODO we could do it is_auctionable/is_commdty */
                ({key, distinct, query} = queries.find(({key}) => key === arg));
                await auctions_db.aggregate([
                    {
                        $group: {
                            _id: {
                                id: "$item.id",
                                is_commdty: {"$ifNull": [ "$unit_price", false ]}
                            }
                        }
                    },
                    {
                        $project: {
                            _id: "$_id.id",
                            is_commdty: {
                                $cond: [{$eq: [ "$_id.is_commdty", false ]}, false, true]
                            }
                        }
                    }
                ]).cursor({batchSize: 10}).exec().eachAsync(async ({_id, is_commdty}) => {
                    let item = await items_db.findById(_id);
                    if (item) {
                        if (is_commdty) {
                            item.asset_class.addToSet("COMMDTY")
                        } else {
                            item.asset_class.addToSet("ITEM")
                        }
                        item.asset_class.addToSet("MARKET")
                        await item.save()
                    }
                }, { parallel: 10 });
                break;
            case 'is_auctionable':
                ({key, distinct, query} = queries.find(({key}) => key === arg));
                items = await auctions_db.distinct('item.id', distinct).lean();
                for (let _id of items) {
                    await items_db.findByIdAndUpdate(_id, query, {new: true}).then(({_id}) => console.info(`U,${_id},${key}`)).catch(e=>console.error(e));
                }
                break;
            case 'is_derivative':
                await pricing_methods_db.find({}).limit(10).cursor({batchSize: 1}).eachAsync( async (method) => {
                    try {
                        /** Derivative Asset Class */
                        if (method.item_id) {
                            let item = await items_db.findById(method.item_id);
                            item.asset_class.addToSet("DERIVATIVE")
                            await item.save()
                        }
                        if (method.alliance_item_id) {
                            let item = await items_db.findById(method.item_id);
                            item.asset_class.addToSet("DERIVATIVE")
                            await item.save()
                        }
                        if (method.horde_item_id) {
                            let item = await items_db.findById(method.item_id);
                            item.asset_class.addToSet("DERIVATIVE")
                            await item.save()
                        }
                        /** Reagent Asset Class */
                        if (method.reagents && method.reagents.length) {
                            for (let {_id} of method.reagents) {
                                let item = await items_db.findById(_id);
                                item.asset_class.addToSet("REAGENT")
                                await item.save()
                            }
                        }
                    } catch (e) {
                        console.error(e)
                    }
                })
                break;
            default:
                /**
                 * If item is reagent is reagent and bop loot_type then gg it's premium
                 */
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
        console.timeEnd(`DMA-${indexAssetClass.name}`);
    } catch (err) {
        console.error(`${indexAssetClass.name},${err}`);
    }
}

indexAssetClass("is_commdty");