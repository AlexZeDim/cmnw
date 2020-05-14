const valuations = require("../../../db/valuations_db");
const getPricingMethods = require("../getPricingMethods");
const premiumSingleName = require("./premiumSingleName");
const auctionsData  = require('../../auctions/auctionsData');

/**
 *
 * @param item {Object}
 * @param connected_realm_id {Number}
 * @param lastModified {Number}
 * @returns {Promise<void>}
 */

async function itemValuationAdjustment (item = {}, connected_realm_id = 1602, lastModified) {
    const methodValuationAdjustment = require('./MVA');
    try {
        if ("quantity" in item) {
            /***
             * IF quantity =>
             * return derivative.reagent items xQuantity
             */
        }
        /***
         * IDEA check is recursive 3 more in line and so on
         * check existing valuation based on timestamp
         */
        if (!lastModified) {
            const auctions_db = require("../../../db/auctions_db");
            ({lastModified} = await auctions_db.findOne({connected_realm_id: connected_realm_id}).sort('-lastModified'));

        }
        let pricing;
        pricing = await valuations.findById(`${item._id}@${connected_realm_id}`).lean();
        if (pricing) {
            if (pricing.market.lastModified === lastModified) {
                return pricing
            }
            if (pricing.derivative.length && pricing.derivative[0].lastModified === lastModified) {
                return pricing
            }
        }
        /**
         * else => evaluation process
         */
        pricing = new valuations({
            _id: `${item._id}@${connected_realm_id}`,
            item_id: item._id,
            connected_realm_id: connected_realm_id,
            asset_class: item.v_class
        });
        /***
         * determine asset class
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
        if (pricing.asset_class.some(v_class => v_class === 'DERIVATIVE')) {
            let primary_methods = await getPricingMethods(item._id, false);
            /** Array of Pricing Methods*/
            for (let price_method of primary_methods) {
                let mva = await methodValuationAdjustment(price_method, connected_realm_id, lastModified);
                if ("premium_items" in mva && item.is_auctionable) {
                    /***
                     * If mva premium items length more then one
                     */
                    if (mva.premium_items.length > 0) {
                        if (mva.premium_items.length === 1) {
                            /***
                             * item is SingleName for premium
                             * _id String (recipe_id)
                             * value: Number (premium value)
                             * wi: Number (premium quantity on market)
                             */
                            await valuations.findByIdAndUpdate({
                                    _id: `${mva.premium_items[0]._id}@${connected_realm_id}`
                                },
                                {
                                    $addToSet: {
                                        "reagent.premium": {
                                            _id: mva._id,
                                            value: Number((((pricing.market.price_size * 0.95) *  mva.queue_quantity - mva.queue_cost) / mva.premium_items[0].quantity).toFixed(2)),
                                            wi: Number(((mva.premium_items[0].quantity/mva.queue_quantity)*pricing.market.quantity).toFixed(3))
                                        }
                                    }
                                },
                                {
                                    upsert : true,
                                    new: true,
                                    lean: true
                                });
                        }
                        /***
                         * Find premium for all items if market price
                         */
                        let w_premium = {
                            premium: Number(((pricing.market.price_size * 0.95) - (mva.nominal_value)).toFixed(2)),
                            queue_cost: Number(((pricing.market.price_size * 0.95) * mva.queue_quantity).toFixed(2)),
                            nominal_value: Number((pricing.market.price_size * 0.95).toFixed(2)),
                        };
                        Object.assign(mva, w_premium);
                    }
                    delete mva.premium_items;
                }
                pricing.derivative.push(mva);
                /** END THREAD*/
            }
        }
        if (pricing.asset_class.some(v_class => v_class === 'REAGENT') && pricing.asset_class.some(v_class => v_class === 'PREMIUM')) {
            let SingleNames = await premiumSingleName(item._id);
            for (let {method} of SingleNames) {
                await methodValuationAdjustment(method, connected_realm_id, lastModified);
            }
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
            /**
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
}

module.exports = itemValuationAdjustment;