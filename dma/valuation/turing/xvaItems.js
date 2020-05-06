const items_db = require("../../../db/items_db");
const pricing_methods = require("../../../db/pricing_methods_db");
const valuations = require("../../../db/valuations_db");
const getPricingMethods = require("../getPricingMethods");
const premiumSingleName = require("./premiumSingleName");
const groupBy = require('lodash/groupBy');
const auctionsData  = require('../../auctions/auctionsData');
const {connection} = require('mongoose');


async function xvaItems () {
    try {
        console.time(`DMA-${xvaItems.name}`); //v_class: ['REAGENT', 'MARKET', 'DERIVATIVE'], profession_class: "INSC",
        let cursor = await items_db.find({expansion: "BFA", _id: 153636}).limit(10).cursor({batchSize: 10});
        cursor.on('data', async item_ => {
            cursor.pause();
            (async function f (item = item_, connected_realm_id = 1602, lastModified) {
                try {
                    /***
                     * IDEA check is recursive 3 more in line and so on
                     * IDEA check valuations cheapest to delivery before valuation!
                     * TODO lastModified to check if found!
                     */
                    let pricing;
                    pricing = await valuations.findById(`${item._id}@${connected_realm_id}`);
/*                    if (v) {
                        return v
                    }*/
                    /**
                     * TODO in not null return, else eva down
                     * timestamp check?
                     */
                    pricing = new valuations({
                        _id: `${item._id}@${connected_realm_id}`,
                        item_id: item._id,
                        connected_realm_id: connected_realm_id,
                        asset_class: item.v_class
                    });
                    /***
                     * check asset class
                     */
                    if (item.sell_price > 0) {
                        pricing.vendor.sell_price = item.sell_price;
                        /** check vendor price out*/
                    }
                    if (item.v_class.some(v_class => v_class === 'VENDOR') || item.v_class.some(v_class => v_class === 'CONST')) {
                        pricing.vendor.buy_price = item.purchase_price;
                        /** check vendor price in*/
                    }
                    if (item.is_auctionable) {
                        let [{min, min_size, _id, quantity, open_interest, orders}] = await auctionsData(item._id, connected_realm_id);
                        pricing.market = {
                            price: min,
                            price_size: min_size,
                            quantity: quantity,
                            open_interest: open_interest,
                            orders: orders,
                            lastModified: _id
                        };
                        /** check auction price in/out*/
                    }
                    if (item.v_class.some(v_class => v_class === 'DERIVATIVE')) {
                        console.log('DERIVATIVE')
                        /** check if derivative*/
                        /**
                         * Evaluate all combinations for FLOOR
                         * we should write it somehow
                         *
                         * */
                        let primary_methods = await getPricingMethods(item._id, false);
                        /** Array of Pricing Methods*/
                        for (let price_method of primary_methods) {
                            /** Pricing Method => Reagents*/

                            const assetClassMap = new Map([
                                ['VENDOR,REAGENT,ITEM', 0],
                                ['CONST,REAGENT,ITEM', 1],
                                ['REAGENT,MARKET,ITEM', 2],
                                ['REAGENT,MARKET,MARKET', 3],
                                ['CAP,MARKET,DERIVATIVE', 4],
                                ['CAP,PREMIUM,DERIVATIVE', 5],
                                ['PREMIUM,REAGENT,DERIVATIVE', 6],
                                ['PREMIUM,MARKET,ITEM', 7],
                                ['PREMIUM,REAGENT,ITEM', 8],
                            ]);

                            let tranches = [];
                            let tranchesByAssetClass = groupBy(price_method.reagent_items, 'v_class');
                            for (const property in tranchesByAssetClass) {
                                if (tranchesByAssetClass.hasOwnProperty(property)) {
                                    tranches.push({asset_class: property, count: tranchesByAssetClass[property].length, tranche_items: tranchesByAssetClass[property]});
                                }
                            }

                            tranches.sort((a, b) => assetClassMap.get(a.asset_class) - assetClassMap.get(b.asset_class));

                            let quene_cost = 0;

                            for (let {asset_class, count, tranche_items} of tranches) {
                                switch (asset_class) {
                                    case 'VENDOR,REAGENT,ITEM':
                                        for (let tranche_item of tranche_items) {
                                            let x = await f(tranche_item, connected_realm_id);
                                            console.log(x);
                                        }
                                        break;
                                    default:
                                        for (let tranche_item of tranche_items) {
                                            let x = await f(tranche_item, connected_realm_id);
                                            console.log(x);
                                        }
                                }
                            }

                            /** THREAD*/
                            //for (let reagent_item of price_method.reagent_items) {
                                //console.log(reagent_item);
                                /** f(n) => ? */
                            //}
                        }
                    }
                    if (item.v_class.some(v_class => v_class === 'REAGENT') && item.v_class.some(v_class => v_class === 'PREMIUM')) {
                        let getSingleNames = await premiumSingleName(item._id);
                        console.log('REAGENT')
                        console.log('PREMIUM')
                        /** if reagent => cheapest to delivery
                         * IDEA should we place here ctd derivative pricing_method?
                         * */
                    }
                    /*** Cheapest-to-delivery*/
                    /**
                     * determine dominant price
                     * TODO and asset_class = vendor
                     * */
                    let count_in = [];
                    let count_out = [];
                    if (pricing.vendor.buy_price) {
                        count_in.push('vendor');
                        pricing.cheapest_to_delivery = 'vendor'
                    }
                    if (pricing.vendor.sell_price) {
                        count_out.push('vendor');
                    }
                    if (pricing.market.lastModified) {
                        count_in.push('market');
                        count_out.push('market')
                    }
                    if (pricing.derivative.lastModified) {
                        count_in.push('derivative')
                    }
                    if (pricing.asset_class.some(v_class => v_class === 'REAGENT')) {
                        /** If item reagent then ctd to it*/
                        count_out.push('reagent');
                        pricing.reagent.premium = 3;
                    }
                    /*** count outs*/
                    for (let in_ of count_in) {
                        let outs = count_out.filter(x => x !== in_);
                        for (let out_ of outs) {
                            let k = `yield${out_.replace(/^[a-z]/i, str => str.toUpperCase())}`;
                            let y_delimiter, y_out;
                            if (in_ === 'vendor') {
                                y_delimiter = pricing.vendor.buy_price
                            }
                            if (out_ === 'vendor') {
                                y_out = pricing.vendor.sell_price
                            }
                            if (in_ === 'market') {
                                y_delimiter = pricing.market.price
                            }
                            if (out_ === 'market') {
                                y_out = pricing.market.price
                            }
                            if (in_ === 'derivative') {
                                y_delimiter = pricing.derivative.nominal_value
                            }
                            if (out_ === 'reagent') {
                                y_out = pricing.reagent.premium
                            }
                            pricing[in_][k] = Number((((y_out - y_delimiter) / y_delimiter) * 100).toFixed(2));
                        }
                    }
                    await valuations.findByIdAndUpdate({
                        _id: pricing._id
                    },{
                        pricing
                    },{
                        upsert : true,
                        new: true,
                        setDefaultsOnInsert: true,
                        lean: true
                    });
                    return pricing;

                    //let primary_methods = await getPricingMethods(item._id, false);
/*                    for (let primary_method of primary_methods) {

                        let tranches = [];
                        let tranchesByAssetClass = groupBy(primary_method.reagent_items, 'v_class');
                        for (const property in tranchesByAssetClass) {
                            if (tranchesByAssetClass.hasOwnProperty(property)) {
                                tranches.push({asset_class: property, count: tranchesByAssetClass[property].length, tranche_items: tranchesByAssetClass[property]});
                            }
                        }
                       method.tranches = tranches;
                        pricing_methods.push(method);

                        console.log(tranchesByAssetClass);
                        for (let r_i of primary_method.reagent_items) {
                            console.log(r_i)
                        }
                    }*/
                } catch (e) {
                    console.log(e);
                }
            })();
            cursor.resume();
        });
        cursor.on('error', error => {
            console.error(`E,DMA-${xvaItems.name},${error}`);
            cursor.close();
        });
        cursor.on('close', async () => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            connection.close();
            console.timeEnd(`DMA-${xvaItems.name}`);
        });
    } catch (err) {
        console.error(`${xvaItems.name},${err}`);
    }
}

xvaItems();

module.exports = xvaItems;