const valuations = require("../../../db/valuations_db");
const getPricingMethods = require("../getPricingMethods");
const premiumSingleName = require("./premiumSingleName");
const auctionsData  = require('../../auctions/auctionsData');
const moment = require('moment');

/**
 *
 * @param item {Object}
 * @param connected_realm_id {Number}
 * @param lastModified {Date}
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
            let t = await auctions_db.findOne({connected_realm_id: connected_realm_id}).sort('-lastModified').select('lastModified').lean();
            if (t) {
                lastModified = t.lastModified
            }
        }
        let pricing;
        pricing = await valuations.findById(`${item._id}@${connected_realm_id}`).lean();
        if (pricing) {
            if (moment(pricing.lastModified).isSame(lastModified)) {
                return pricing
            }
            if ("lastModified" in pricing.market) {
                if (moment(pricing.market.lastModified).isSame(lastModified)) {
                    return pricing
                }
            }
            if ("derivative" in pricing && pricing.derivative.length) {
                if (moment(pricing.derivative[0].lastModified).isSame(lastModified)) {
                    return pricing
                }
            }
        }
        /**
         * If not valuation found then start evaluation process
         */
        pricing = new valuations({
            _id: `${item._id}@${connected_realm_id}`,
            item_id: item._id,
            connected_realm_id: connected_realm_id,
            asset_class: item.v_class,
            lastModified: lastModified
        });
        /***
         * Vendor Valuation Adjustment
         */
        if (item.v_class.some(v_class => v_class === 'VENDOR') || item.v_class.some(v_class => v_class === 'CONST')) {
            /** check vendor price in*/
            pricing.vendor.buy_price = item.purchase_price;
        }
        if (item.sell_price > 0) {
            /** check vendor price out*/
            pricing.vendor.sell_price = item.sell_price;
        }
        /** END of VVA */

        /***
         * Auction Valuation Adjustment
         */
        if (item.is_auctionable) {
            /** Request for Quotes*/
            let [{min, min_size, _id, quantity, open_interest, orders}] = await auctionsData(item._id, connected_realm_id);
            /** If price found, then => market*/
            if (min && min_size) {
                pricing.market = {
                    price: min,
                    price_size: min_size,
                    quantity: quantity,
                    open_interest: Math.round(open_interest),
                    orders: orders,
                    lastModified: _id
                };
            }
        }
        /** END of AVA */

        /***
         * Derivative Valuation Adjustment
         */
        if (pricing.asset_class.some(v_class => v_class === 'DERIVATIVE')) {
            /** Request all Pricing Methods */
            let primary_methods = await getPricingMethods(item._id, false);
            /** Iterate over it one by one */
            for (let price_method of primary_methods) {

                /***
                 * Method Valuation Adjustment
                 */
                let mva = await methodValuationAdjustment(price_method, connected_realm_id, lastModified, item_depth, method_depth);

                /** If MVA returns at least one premium reagent and IVA item has market price */
                if ("premium_items" in mva && pricing.price_size) {
                    if (mva.premium_items.length) {
                        /** For all premium reagents without valuation in method.. */
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
                /** END of MVA */
            }
        }
        /** END of DVA */

        /**
         * Premium Reagent Valuation Adjustment
         * (only direct!)
         */
        if (method_depth === 0 && item_depth === 0) {
            if (pricing.asset_class.some(v_class => v_class === 'REAGENT') && pricing.asset_class.some(v_class => v_class === 'PREMIUM')) {
                /** Request list of all single names methods */
                let SingleNames = await premiumSingleName(item._id);
                /**
                 * Method Valuation Adjustment
                 *
                 * !We evaluate every method not items!
                 * Iterate over every single name one by one..
                 */
                for (let method of SingleNames) {
                    let single_premium = await methodValuationAdjustment(
                        method,
                        connected_realm_id,
                        lastModified,
                        item_depth,
                        method_depth,
                        true
                    );

                    let [{min_size, quantity}] = await auctionsData(method.item_id, connected_realm_id);
                    /** If market data exists and premium_item just one */
                    if (min_size && quantity) {
                        /** If premium have PRVA */
                        pricing.reagent.premium.push({
                            _id: single_premium._id,
                            value: Number((((min_size * 0.95) * single_premium.queue_quantity - single_premium.queue_cost) / single_premium.premium_items[0].quantity).toFixed(2)),
                            wi: Number(((single_premium.premium_items[0].quantity / single_premium.queue_quantity) * quantity).toFixed(3))
                        });
                    }
                }
                /** END of MVA */
            }
        }
        /** END of PRVA */

        /**
         * Preparation for Yield Valuation Adjustment
         */
        let count_in = [];
        let count_out = [];
        if (pricing.vendor.buy_price) {
            count_in.push('vendor');
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

        /**
         * Reagent Valuation Adjustment
         *
         * Cheapest-to-Delivery
         */
        if ((pricing.asset_class.some(v_class => v_class === 'REAGENT') || allowCap === true)) {
            let reagentArray = [];
            for (let source_in of count_in) {
                switch (source_in) {
                    case 'vendor':
                        reagentArray.push({name: 'vendor', value: pricing.vendor.buy_price});
                        break;
                    case 'market':
                        reagentArray.push({name: 'market', value: pricing.market.price_size});
                        break;
                    case 'derivative':
                        let ctd = {min: Number(pricing.derivative[0].nominal_value), index: 0};
                        pricing.derivative.forEach(({nominal_value, rank}, i) => {
                            if (nominal_value < ctd.min) {
                                ctd.min = nominal_value;
                                ctd.index = i;
                            }
                        });
                        reagentArray.push({name: 'derivative', value: ctd.min, index: ctd.index});
                        /** if derivative exist, push cheapest-to-delivery at index */
                        pricing.reagent.index = ctd.index;
                        break;
                }
            }
            if (reagentArray.length) {
                /**
                 * RVA for reagent
                 *
                 * cheapest-to-delivery among vendor, market, derivative
                 */
                Object.assign(pricing.reagent, reagentArray.reduce((prev, curr) => prev.value < curr.value ? prev : curr));
                count_out.push('reagent');
            } else {
                /**
                 * RVA for Premium Reagent
                 *
                 * if no cheapest-to-delivery among vendor, market, derivative
                 * them take it from premium array
                 */
                if (pricing.reagent.premium.length) {
                    let premium_value = pricing.reagent.premium[0].value
                    let wi_max = pricing.reagent.premium[0].wi;
                    let wi_index = 0;
                    pricing.reagent.premium.forEach(({value, wi}, i) => {
                        if (wi > wi_max) {
                            wi_max = wi;
                            premium_value = value;
                            wi_index = i;
                        }
                    });
                    pricing.reagent.name = "premium";
                    pricing.reagent.value = wi_max;
                    pricing.reagent.index = wi_index;
                }
            }
            if (pricing.reagent.premium.length) {
                let premium_value = pricing.reagent.premium[0].value
                let wi_max = pricing.reagent.premium[0].wi;
                let wi_index = 0;
                pricing.reagent.premium.forEach(({value, wi}, i) => {
                    if (wi > wi_max) {
                        wi_max = wi;
                        premium_value = value;
                        wi_index = i;
                    }
                });
                pricing.reagent.p_value = premium_value;
                pricing.reagent.p_index = wi_index;
            }
            /** END of RVA for PR */
        }
        /** END of RVA */

        /***
         * Yield Valuation Adjustment
         */
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
        /** END of YVA */
        return await valuations.findByIdAndUpdate({
                _id: pricing._id
            },
            pricing.toObject(), {
                upsert : true,
                new: true,
                lean: true
            });
    } catch (e) {
        console.log(e);
    }
}

module.exports = itemValuationAdjustment;