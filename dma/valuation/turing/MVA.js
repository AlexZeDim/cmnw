/**
 * Modules
 */

const {Round2} = require("../../../db/setters")

/***
 * TODO RECURSIVE CONTROL
 * @param method
 * @param connected_realm_id
 * @param last_modified
 * @param item_depth
 * @param method_depth
 * @param single_name
 * @returns {Promise<{queue_quantity: number, reagent_items: [], premium_items: [], nominal_value: number, _id: string, queue_cost: number}>}
 */

async function methodValuationAdjustment (
        method = {},
        connected_realm_id = 1602,
        last_modified,
        item_depth = 0,
        method_depth = 0,
        single_name = false
    ) {
    const itemValuationAdjustment = require('./IVA');
    try {
        const assetClass_index = async (asset = []) => {
            try {
                const assetClassMap = new Map([
                    [0, ['VENDOR','REAGENT','ITEM']],
                    [1, ['CONST','REAGENT','ITEM']],
                    [2, ['PREMIUM','REAGENT','DERIVATIVE']],
                    [3, ['PREMIUM','MARKET','ITEM']],
                    [4, ['PREMIUM','REAGENT','ITEM']],
                    [5, ['REAGENT','MARKET','ITEM']],
                    [6, ['REAGENT','MARKET','DERIVATIVE']],
                    [7, ['CAP','MARKET','DERIVATIVE']],
                    [8, ['CAP','PREMIUM','DERIVATIVE']],
                ]);
                for (let [k, ac] of assetClassMap) {
                    let match = ac.every(i => asset.includes(i));
                    if (match) return k
                }
            } catch (e) {
                console.error(e)
            }
        };
        /**
         * Sort reagent_items according to map
         */
        method.reagent_items.sort((a, b) => assetClass_index(a.asset_class) - assetClass_index(b.asset_class));
        /**
         * Init queue_cost cost and premium
         */
        let queue_cost = 0;
        let premium_items = [];
        let reagent_items = [];
        for (let reagent_item of method.reagent_items) {
            /**
             * Check Reagent.value, if there is not add to cost 0, but premium
             * premium += (Price market (if exist) - quene_cost)
             * */
            if (reagent_item.asset_class.some(asset_class => asset_class === 'PREMIUM')) {
                /**
                 * if iva has value then for premium
                 */
                if (single_name === true) {
                    Object.assign(reagent_item, {
                        price: 0,
                        value: 0
                    });
                } else {
                    let iva = await itemValuationAdjustment(reagent_item, connected_realm_id, last_modified, item_depth+1, method_depth+1);
                    if ("reagent" in iva) {
                        if ("value" in iva.reagent) {
                            Object.assign(reagent_item, {
                                price: iva.reagent.value,
                                value: Round2(iva.reagent.value * reagent_item.quantity)
                            });
                        } else {
                            /** failsafe */
                            if (iva.reagent.premium.length > 0) {
                                const {value} = iva.reagent.premium.reduce((p, c) => p.wi > c.wi ? p : c);
                                Object.assign(reagent_item, {
                                    price: value,
                                    value: Round2(value * reagent_item.quantity)
                                });
                            } else {
                                /** failsafe */
                                Object.assign(reagent_item, {
                                    price: 0,
                                    value: 0
                                });
                            }
                        }
                    } else {
                        /** failsafe */
                        Object.assign(reagent_item, {
                            price: 0,
                            value: 0
                        });
                    }
                }
                /**
                 * Add to reagent_items successfully evaluated premium item
                 * and to premium_items as well
                 */
                premium_items.push(reagent_item);
                reagent_items.push(reagent_item);
            } else {
                /**
                 * if method._id || method.item_id allow cap =>
                 * pass to IVA as allow cap as reagent {define reagent there}
                 *
                 * IDEA item_id premium allow cap?
                 */
                let allowCap = false;
                /**
                 * This exception for 152668:Expulsom
                 *
                 * wtf? EXPL is premium it can't be here!
                 * WE EVALUATE EXPULSOM, NOT AS REAGENT!
                 */
                if (method.item_id === 152668) {
                    allowCap = true;
                }
                let iva = await itemValuationAdjustment(reagent_item, connected_realm_id, last_modified, item_depth+1, method_depth+1, allowCap);
                if ("reagent" in iva) {
                    Object.assign(reagent_item, {
                        price: iva.reagent.value,
                        value: Round2(iva.reagent.value * reagent_item.quantity)
                    });
                    queue_cost += Round2(iva.reagent.value * reagent_item.quantity);
                } else {
                    /** failsafe */
                    Object.assign(reagent_item, {
                        price: 0,
                        value: 0
                    })
                }
                /**
                 * Add to reagent_items successfully evaluated item
                 */
                reagent_items.push(reagent_item);
            }
        }
        /**
         * End of loop
         * Proc chance exception
         */
        let n_value = Round2(queue_cost / method.item_quantity);
        if (method.expansion === 'BFA' && method.profession === 'ALCH' && method.rank === 3) {
            n_value = Round2((queue_cost / method.item_quantity) * 0.6);
        }
        return {
            _id: method._id,
            rank: method.rank || 0,
            queue_cost: Round2(queue_cost),
            queue_quantity: parseInt(method.item_quantity),
            nominal_value: n_value,
            last_modified: last_modified,
            reagent_items: reagent_items,
            premium_items: premium_items
        };
    } catch (e) {
        console.error(e);
    }
}

module.exports = methodValuationAdjustment;