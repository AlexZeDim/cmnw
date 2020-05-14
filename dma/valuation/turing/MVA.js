/***
 * TODO RECURSIVE CONTROL
 * @param method
 * @param connected_realm_id
 * @param lastModified
 * @returns {Promise<{queue_quantity: number, reagent_items: [], premium_items: [], nominal_value: number, _id: string, queue_cost: number}>}
 */

async function methodValuationAdjustment (method = {}, connected_realm_id = 1602, lastModified) {
    const itemValuationAdjustment = require('./IVA');
    try {
        /**
         * Asset Class hierarchy map
         * @type {Map<string, number>}
         */
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
        /**
         * Sort reagent_items according to map
         */
        method.reagent_items.sort((a, b) => assetClassMap.get(a.v_class) - assetClassMap.get(b.v_class));
        /**
         * Init production cost and premium
         * @type {number}
         */
        let queue_cost = 0;
        let premium_items = [];
        let reagent_items = [];
        for (let reagent_item of method.reagent_items) {
            /**
             * Check Reagent.value, if there is not add to cost 0 but premium
             * premium += (Price market (if exist) - quene_cost)
             * */
            if (reagent_item.v_class.some(v_class => v_class === 'PREMIUM')) {
                /**
                 * if iva has value then from premium
                 */
                let iva = await itemValuationAdjustment(reagent_item, connected_realm_id, lastModified);
                if ("reagent" in iva) {
                    if ("value" in iva.reagent) {
                        Object.assign(reagent_item, {
                            price: iva.reagent.value,
                            value: parseFloat((iva.reagent.value * reagent_item.quantity).toFixed(2))
                        });
                    } else {
                        if (iva.reagent.premium.length > 0) {
                            const {value} = iva.reagent.premium.reduce((p, c) => p.wi > c.wi ? p : c);
                            Object.assign(reagent_item, {
                                price: value,
                                value: parseFloat((value * reagent_item.quantity).toFixed(2))
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
                premium_items.push(reagent_item);
                reagent_items.push(reagent_item);
            } else {
                let iva = await itemValuationAdjustment(reagent_item, connected_realm_id, lastModified);
                if ("reagent" in iva) {
                    Object.assign(reagent_item, {
                        price: iva.reagent.value,
                        value: parseFloat((iva.reagent.value * reagent_item.quantity).toFixed(2))
                    });
                    queue_cost += Number((iva.reagent.value * reagent_item.quantity).toFixed(2));
                } else {
                    /** failsafe */
                    Object.assign(reagent_item, {
                        price: 0,
                        value: 0
                    })
                }
                reagent_items.push(reagent_item);
            }
        }
        /**
         * End of loop
         */
        return {
            _id: method._id,
            queue_cost: Number(queue_cost.toFixed(2)),
            queue_quantity: Number(method.item_quantity),
            nominal_value: Number((queue_cost / method.item_quantity).toFixed(2)),
            lastModified: lastModified,
            reagent_items: reagent_items,
            premium_items: premium_items
        };
    } catch (e) {
        console.error(e);
    }
}

module.exports = methodValuationAdjustment;