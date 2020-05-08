const valuations = require("../../../db/valuations_db");
const getPricingMethods = require("../getPricingMethods");
const premiumSingleName = require("./premiumSingleName");
const auctionsData  = require('../../auctions/auctionsData');


async function itemValuationAdjustment (item = {}, connected_realm_id = 1602, lastModified) {
    const methodValuationAdjustment = require('./MVA');
    try {
        /***
         * IDEA check is recursive 3 more in line and so on
         * IDEA check valuations cheapest to delivery before valuation!
         * TODO lastModified to check if found!
         */
        let pricing;
        //pricing = await valuations.findById(`${item._id}@${connected_realm_id}`).lean();
        /*if (pricing) {
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
        if (pricing.asset_class.some(v_class => v_class === 'DERIVATIVE')) {
            /**
             * Evaluate all combinations for FLOOR
             * we should write it somehow
             *
             * */
            let primary_methods = await getPricingMethods(item._id, false);
            /** Array of Pricing Methods*/
            for (let price_method of primary_methods) {
                let mva = await methodValuationAdjustment(price_method, connected_realm_id);
                console.log(mva);
                pricing.derivative.push(mva);
                /** END THREAD*/
            }
        }
        if (pricing.asset_class.some(v_class => v_class === 'REAGENT') && pricing.asset_class.some(v_class => v_class === 'PREMIUM')) {
            let getSingleNames = await premiumSingleName(item._id);
            for (let {_id, method} of getSingleNames) {

                console.log(_id.recipe_id, _id.item_id, _id.item_quantity, _id.alliance_item_id, method);
                for (let reagent_item of method[0].reagent_items) {

                }
                /***
                 * TODO probably thread
                 * */
                console.log(`=== Single Names PREMIUM && REAGENT ===`);
                console.log(method[0].reagent_items);
                console.log(`=== END Single Names ===`);
            }
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
}

module.exports = itemValuationAdjustment;