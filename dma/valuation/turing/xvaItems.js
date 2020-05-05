const items_db = require("../../../db/items_db");
const pricing_methods = require("../../../db/pricing_methods_db");
const valuation = require("../../../db/valuations_db");
const getPricingMethods = require("../getPricingMethods");
const groupBy = require('lodash/groupBy');
const auctionsData  = require('../../auctions/auctionsData');
const {connection} = require('mongoose');


async function xvaItems () {
    try {
        console.time(`DMA-${xvaItems.name}`); //v_class: ['REAGENT', 'MARKET', 'DERIVATIVE'], profession_class: "INSC",
        let cursor = await items_db.find({expansion: "BFA", _id: 162460}).limit(10).cursor({batchSize: 10});
        cursor.on('data', async item_ => {
            cursor.pause();
            (async function f (item = item_, connected_realm_id = 1602) {
                try {
                    /***
                     * IDEA check valuations cheapest to delivery before valuation!
                     */
                    let v = await valuation.findById(`${item._id}@${connected_realm_id}`);
                    console.log(v);
                    /**
                     * TODO in not null return, else eva down
                     * timestamp check?
                     */
                    let pricing = new valuation({
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
                        //let primary_methods = await getPricingMethods(item._id, false);
                    }
                    if (item.v_class.some(v_class => v_class === 'REAGENT') && item.v_class.some(v_class => v_class === 'PREMIUM')) {
                        console.log('REAGENT')
                        console.log('PREMIUM')
                        /** if reagent => cheapest to delivery
                         * IDEA should we place here ctd derivative pricing_method?
                         * */
                    }
                    /*** Cheapest-to-delivery*/
                    let cheapest_to_delivery = (arg) => {
                        /**
                         * determine dominant price
                         * TODO and asset_class = vendor
                         * */
                        let count_in = [];
                        let count_out = [];
                        if (arg.vendor.buy_price) {
                            count_in.push('vendor');
                            arg.cheapest_to_delivery = 'vendor'
                        }
                        if (arg.vendor.sell_price) {
                            count_out.push('vendor');
                        }
                        if (arg.market.lastModified) {
                            count_in.push('market');
                            count_out.push('market')
                        }
                        if (arg.derivative.lastModified) {
                            count_in.push('derivative')
                        }
                        if (arg.asset_class.some(v_class => v_class === 'REAGENT')) {
                            /** If item reagent then ctd to it*/
                            count_out.push('reagent');
                            arg.reagent.premium = 3;
                        }
                        /*** count outs*/
                        for (let in_ of count_in) {
                            let outs = count_out.filter(x => x !== in_);
                            for (let out_ of outs) {
                                let k = `yield${out_.replace(/^[a-z]/i, str => str.toUpperCase())}`;
                                let y_delimiter, y_out;
                                if (in_ === 'vendor') {
                                    y_delimiter = arg.vendor.buy_price
                                }
                                if (out_ === 'vendor') {
                                    y_out = arg.vendor.sell_price
                                }
                                if (in_ === 'market') {
                                    y_delimiter = arg.market.price
                                }
                                if (out_ === 'market') {
                                    y_out = arg.market.price
                                }
                                if (in_ === 'derivative') {
                                    y_delimiter = arg.derivative.nominal_value
                                }
                                if (out_ === 'reagent') {
                                    y_out = arg.reagent.premium
                                }
                                arg[in_][k] = Number((((y_out - y_delimiter) / y_delimiter) * 100).toFixed(2)) ;
                            }
                            /** remove this out*/
                        }
                        console.log(arg)
                    };
                    cheapest_to_delivery(pricing);

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