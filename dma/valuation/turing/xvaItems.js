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
        let cursor = await items_db.find({expansion: "BFA", _id: 169449}).limit(10).cursor({batchSize: 10});
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
                    //pricing = await valuations.findById(`${item._id}@${connected_realm_id}`).lean();
/*                    if (pricing) {
                        console.log('ok')
                        return pricing
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
                        /** check vendor price out*/
                        pricing.vendor.sell_price = item.sell_price;
                    }
                    if (item.v_class.some(v_class => v_class === 'VENDOR') || item.v_class.some(v_class => v_class === 'CONST')) {
                        /** check vendor price in*/
                        pricing.vendor.buy_price = item.purchase_price;
                    }
                    if (item.is_auctionable) {
                        /** check auction price in/out*/
                        let [{min, min_size, _id, quantity, open_interest, orders}] = await auctionsData(item._id, connected_realm_id);
                        pricing.market = {
                            price: min,
                            price_size: min_size,
                            quantity: quantity,
                            open_interest: open_interest,
                            orders: orders,
                            lastModified: _id
                        };
                    }
                    if (item.v_class.some(v_class => v_class === 'DERIVATIVE')) {

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

                            price_method.reagent_items.sort((a, b) => assetClassMap.get(a.v_class) - assetClassMap.get(b.v_class));

                            let quene_cost = 0;
                            let premium = 0;
                            let x;
                            for (let reagent_item of price_method.reagent_items) {
                                switch (reagent_item.v_class.toString()) {
                                    case 'PREMIUM,REAGENT,ITEM':
                                        x = await f(reagent_item, connected_realm_id);
                                        console.log(`===`);
                                        console.log(x);
                                        console.log(`===`);
                                        console.log(reagent_item);
                                        /**
                                         * Check Reagent.value, if there is not add to cost 0 but premium
                                         * premium += (Price market (if exist) - quene_cost)
                                         * */
                                        break;
                                    default:
                                        /**
                                         * TODO add price to reagent_item and value
                                         *
                                         *  */
                                        console.log(item._id); //item.quantity!
                                        console.log(reagent_item.quantity);//quantity
                                        x = await f(reagent_item, connected_realm_id);

                                        Object.assign(reagent_item, {
                                            price: x.reagent.value,
                                            value: parseFloat((x.reagent.value * reagent_item.quantity).toFixed(2))
                                        });

                                        console.log(x.reagent);
                                        /**
                                         * If reagent have index for derivative, then take derivative[index] reagent_items?
                                         * Else? Market => add reagent_item
                                         *
                                         * ( Method.item_quantity / pricing_method.quantity ) * reagent_item.quantity?
                                         */

                                        quene_cost += Number((x.reagent.value * reagent_item.quantity).toFixed(2));
                                }
                            }
                            pricing.derivative.push({
                                _id: price_method._id,
                                quene_cost: Number(quene_cost.toFixed(2)),
                                quene_quantity: price_method.item_quantity,
                                nominal_value: Number((quene_cost / price_method.item_quantity).toFixed(2)), //TODO add premium to (quene_cost)
                            });
                            /** END THREAD*/
                        }
                    }
                    if (item.v_class.some(v_class => v_class === 'REAGENT') && item.v_class.some(v_class => v_class === 'PREMIUM')) {
                        let getSingleNames = await premiumSingleName(item._id);
                        for (let {_id, method} of getSingleNames) {
                            /***
                             * TODO probably thread
                             * */
                            console.log(method[0].reagent_items);
                        }
                        console.log('REAGENT')
                        console.log('PREMIUM')
                        /** if reagent => cheapest to delivery
                         * IDEA should we place here ctd derivative pricing_method?
                         * */
                    }
                    /***
                     * All in and out combinations
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
                    if (pricing.derivative.length > 0) {
                        count_in.push('derivative')
                    }
                    /***
                     * Cheapest-to-delivery for Reagent {name, value, index}
                     * */
                    if (pricing.asset_class.some(v_class => v_class === 'REAGENT') && !pricing.asset_class.some(v_class => v_class === 'PREMIUM')) {
                        let reagentArray = [];
                        for (let source of count_in) {
                            switch (source) {
                                case 'vendor':
                                    reagentArray.push({name: 'vendor', value: pricing.vendor.buy_price});
                                break;
                                case 'market':
                                    reagentArray.push({name: 'market', value: pricing.market.price_size});
                                break;
                                case 'derivative':
                                    let ctd = {min: pricing.derivative[0].nominal_value, index: 0};
                                    pricing.derivative.forEach(({nominal_value}, i) => {
                                        if (nominal_value < ctd.min) {
                                            ctd.min = nominal_value;
                                            ctd.index = i;
                                        }
                                    });
                                    reagentArray.push({name: 'derivative', value: ctd.min, index: ctd.index});
                                break;
                            }
                        }
                        /***
                         * TODO error for premium we should add value to compare
                         * {name: 'premium', value: Number, method: String}
                         */
                        Object.assign(pricing.reagent, reagentArray.reduce((prev, curr) => prev.value < curr.value ? prev : curr));
                        count_out.push('reagent');
                    }
                    /***
                     * Yield calculation for each in and out
                     * */
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
                                if (k !== 'yieldReagent') {
                                    pricing.derivative.map(method => {
                                        Object.assign(method, {[k]: Number((((y_out - method.nominal_value) / method.nominal_value) * 100).toFixed(2))});
                                    });
                                }
                            }
                            if (out_ === 'reagent') {
                                y_out = pricing.reagent.value
                            }
                            pricing[in_][k] = Number((((y_out - y_delimiter) / y_delimiter) * 100).toFixed(2));
                        }
                    }
                    const pricingObject = pricing.toObject();
                    return await valuations.findByIdAndUpdate({
                        _id: pricingObject._id
                    },
                    pricingObject, {
                        upsert : true,
                        new: true,
                        lean: true
                    });
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