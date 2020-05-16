const valuations = require("../../../db/valuations_db");
const getPricingMethods = require("../getPricingMethods");
const premiumSingleName = require("./premiumSingleName");
const auctionsData  = require('../../auctions/auctionsData');

/**
 *
 * @param item {Object}
 * @param connected_realm_id {Number}
 * @param lastModified {Number}
 * @param item_depth {Number}
 * @param method_depth {Number}
 * @param allowCap
 * @returns {Promise<void>}
 */

async function itemValuationAdjustment (
        item = {},
        connected_realm_id = 1602,
        lastModified,
        item_depth = 0,
        method_depth = 0,
        allowCap = false
    ) {
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
            if ("market" in pricing && pricing.market.lastModified === lastModified) {
                return pricing
            }
            if ("derivative" in pricing) {
                if (pricing.derivative.length && pricing.derivative[0].lastModified === lastModified) {
                    return pricing
                }
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
                let mva = await methodValuationAdjustment(price_method, connected_realm_id, lastModified, item_depth, method_depth);
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
        /**
         *
         */
        if (method_depth === 0 && item_depth === 0) {
            if (pricing.asset_class.some(v_class => v_class === 'REAGENT') && pricing.asset_class.some(v_class => v_class === 'PREMIUM')) {
                let SingleNames = await premiumSingleName(item._id);
                const L = pricing.reagent.premium.length;
                console.log(`F: ${SingleNames.length}, L: ${L}`)
                /**
                 * premiumSingleName can't have alliance or horde items
                 */
                for (let {method} of SingleNames) {
                    let single_premium = await methodValuationAdjustment(method[0], connected_realm_id, lastModified, item_depth, method_depth, true);
                    let [{min_size, quantity}] = await auctionsData(method[0].item_id, connected_realm_id);
                    console.log(
                        `Method: ${_id}
                        Item: ${method[0].item_id}
                        Price: ${min_size}
                        Quantity:${quantity}
                        Method Quantity: ${single_premium.queue_quantity}
                        Method Q_Cost: ${single_premium.queue_cost}
                        Premium_Q: ${single_premium.premium_items[0].quantity}`
                    )
                    if (single_premium.premium_items.length === 1) {
                        /***
                         * item is SingleName for premium
                         * _id String (recipe_id)
                         * value: Number (premium value)
                         * wi: Number (premium quantity on market)
                         */
                        if (L) {
                            await valuations.findByIdAndUpdate({
                                    _id: `${single_premium.premium_items[0]._id}@${connected_realm_id}`
                                },
                                {
                                    $addToSet: {
                                        "reagent.premium": {
                                            _id: single_premium._id,
                                            value: Number((((min_size * 0.95) *  single_premium.queue_quantity - single_premium.queue_cost) / single_premium.premium_items[0].quantity).toFixed(2)),
                                            wi: Number(((single_premium.premium_items[0].quantity/single_premium.queue_quantity)*quantity).toFixed(3))
                                        }
                                    }
                                },
                                {
                                    upsert : true,
                                    new: true,
                                    lean: true
                                });
                        } else {
                            let methodExists = pricing.reagent.premium.some(element => element._id === single_premium._id);
                            if (methodExists) {
                                let find = Object.assign({}, pricing.reagent.premium.find(element => element._id === single_premium._id));
                                find._id = single_premium._id;
                                find.value = Number((((min_size * 0.95) *  single_premium.queue_quantity - single_premium.queue_cost) / single_premium.premium_items[0].quantity).toFixed(2))
                                find.wi = Number(((single_premium.premium_items[0].quantity/single_premium.queue_quantity)*quantity).toFixed(3))
                            } else {
                                pricing.reagent.premium.push({
                                    _id: single_premium._id,
                                    value: Number((((min_size * 0.95) *  single_premium.queue_quantity - single_premium.queue_cost) / single_premium.premium_items[0].quantity).toFixed(2)),
                                    wi: Number(((single_premium.premium_items[0].quantity/single_premium.queue_quantity)*quantity).toFixed(3))
                                });
                            }
                        }
                    }
                }
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
         * TODO cap not here, but we need it
         * */
        if ((pricing.asset_class.some(v_class => v_class === 'REAGENT') || allowCap === true)) {
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
                        /**
                         * Check proc chance if item is ALCH (method)
                         * @type {{min: number, index: number}}
                         */
                        let ctd = {min: Number(pricing.derivative[0].nominal_value), index: 0};
                        pricing.derivative.forEach(({nominal_value, rank}, i) => {
                            if (nominal_value < ctd.min) {
                                ctd.min = nominal_value;
                                ctd.index = i;
                            }
                        });
                        reagentArray.push({name: 'derivative', value: Number((ctd.min).toFixed(2)), index: ctd.index});
                        /***
                         * if derivative exist, push cheapest among all at index
                         */
                        Object.assign(pricing.reagent, {index: ctd.index});
                        break;
                }
            }
            /**
             * {name: 'premium', value: Number, method: String}
             */
            if (reagentArray.length) {
                Object.assign(pricing.reagent, reagentArray.reduce((prev, curr) => prev.value < curr.value ? prev : curr));
                count_out.push('reagent');
            } else {
                if (pricing.reagent.premium.length) {
                    let [wi_max, wi_index] = pricing.reagent.premium.reduce((prev, curr, i) => prev.wi > curr.wi ? [prev, i] : [curr, i])
                    Object.assign(pricing.reagent, {name: "premium", value: wi_max.value, index: wi_index});
                }
            }
            if (pricing.reagent.premium.length) {
                let [wi_max, wi_index] = pricing.reagent.premium.reduce((prev, curr, i) => prev.wi > curr.wi ? [prev, i] : [curr, i])
                Object.assign(pricing.reagent, {p_value: wi_max.value, p_index: wi_index});
            }
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