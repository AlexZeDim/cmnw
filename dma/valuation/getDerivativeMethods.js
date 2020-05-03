const getPricingMethods = require("./getPricingMethods");
const groupBy = require('lodash/groupBy');

/**
 * This function takes getPricingMethod as returns combinations
 * for vanilla items and/or returns unmodified array of pricingMethods
 *
 * @param primary_methods array of pricing_method objects.
 * @returns {Promise<[]>} return array of objects
 */

async function getDerivativeMethods (
    primary_methods = []
    ) {
    try {
        let pricing_methods = [];
        /**
         _id: 13957,
         quantity: [ 1, 1 ],
         spell_id: 252390,
         item_id: 163082,
         item_quantity: 1,
         reagents_items: [ [Object], [Object] ]
         */
        for (let method of primary_methods) {
            /**
             * If VANILLA reagent not exits,
             * return unmodified value
             */
            if (!method.reagent_items.some(({asset_class}) => asset_class === 'VANILLA')) {
                /**
                 * Create tranches
                 */
                let tranches = [];
                let tranchesByAssetClass = groupBy(method.reagent_items, 'asset_class');
                for (const property in tranchesByAssetClass) {
                    if (tranchesByAssetClass.hasOwnProperty(property)) {
                        tranches.push({asset_class: property, count: tranchesByAssetClass[property].length, tranche_items: tranchesByAssetClass[property]});
                    }
                }
                method.tranches = tranches;
                pricing_methods.push(method);
            } else {
                /**
                 * We default unmodified method to the result array
                 * and add tranches to it
                 * @type {*[]}
                 */
                let tranches = [];
                let tranchesByAssetClass = groupBy(method.reagent_items, 'asset_class');
                for (const property in tranchesByAssetClass) {
                    if (tranchesByAssetClass.hasOwnProperty(property)) {
                        tranches.push({asset_class: property, count: tranchesByAssetClass[property].length, tranche_items: tranchesByAssetClass[property]});
                    }
                }
                method.tranches = tranches;
                pricing_methods.push(method);
                /**
                 * We filter reagents_items to receive all
                 * VANILLA items inside of it.
                 * @type {Array}
                 */
                let vanilla_ReagentItems = [...method.reagent_items.filter(reagent_item => reagent_item.asset_class === 'VANILLA')];
                let vanilla_MethodsCombinations = [];
                /**
                 * We request pricingMethods for
                 * every VANILLA item inside
                 * default method reagent_item
                 */
                for await (let vanilla_ItemCombination of vanilla_ReagentItems.map(({_id, name, is_auctionable, quantity}, i) =>
                    getPricingMethods(_id, true).then(vanilla_PricingMethods => {
                        for (let vanilla_Method of vanilla_PricingMethods) {
                            for (let r_item of vanilla_Method.reagent_items) {
                                /**
                                 * We need to change reagent_items quantity
                                 * according to vanilla_item quantity
                                 * TODO check quantity and fix
                                 * @type {number}
                                 */
                                console.info(`${method.item_quantity} ${name.en_GB},${quantity} / ${r_item.name.en_GB},${r_item.quantity}`)
                                r_item.quantity = parseFloat((quantity * r_item.quantity).toFixed(3));
                            }
                        }
                        /**
                         * We need to add the vanilla item itself only and
                         * only if he has pricing on auction house via cloning of original method.
                         */
                        if (is_auctionable) {
                            let cloneMethod = Object.assign({}, method);
                            cloneMethod._id = `M${method.recipe_id}`;
                            cloneMethod.reagent_items = [vanilla_ReagentItems[i]];
                            vanilla_PricingMethods.push(cloneMethod);
                        }
                        return vanilla_PricingMethods
                    })
                )) {
                    /**
                     * ITEM => [cmb1, ... cmbN] Add all available values of
                     * VANILLA item pricing for Cartesian product stage
                     */
                    vanilla_MethodsCombinations.push(vanilla_ItemCombination);
                }
                /**
                 * This code creates all possible combinations for VANILLA product
                 * The algorithm is knows as Cartesian Product
                 * Provided by Nina Scholz: https://stackoverflow.com/a/50631472/7475615
                 */
                let vanilla_CartesianProduct = vanilla_MethodsCombinations.reduce((a, b) => a.reduce((r, v) => r.concat(b.map(w => [].concat(v, w))), []));

                let combinationID = 0;
                for (let v_CombinedMethod of vanilla_CartesianProduct) {
                    combinationID += 1;
                    /**
                     * Create clones of current method for all Cartesian product
                     */
                    console.log(`${combinationID}=================`);
                    let combinedMethod = Object.assign({}, method);
                    combinedMethod._id = `D${method.recipe_id}:${combinationID}`;
                    combinedMethod.type = `derivative`;
                    combinedMethod.createdBy = `DMA-${getDerivativeMethods.name}`;
                    combinedMethod.updatedBy = `DMA-${getDerivativeMethods.name}`;
                    combinedMethod.reagent_items = [...method.reagent_items.filter(reagent_item => reagent_item.asset_class !== 'VANILLA')];
                    /**
                     * Taking pricing method for every VANILLA item
                     * from combinations and it's reagent_items
                     */
                    let reagentItems = [];
                    if (Array.isArray(v_CombinedMethod)) {
                        for (let v_combination of v_CombinedMethod) {
                            reagentItems.length = 0;
                            /**
                             * Each reagent_item from each vanilla item
                             * pricing method added to cloned reagent_items method
                             */
                            v_combination.reagent_items.map(reagent_item => {
                                console.log(`+ ${reagent_item.name.en_GB},${reagent_item.quantity}`);
                                reagentItems.push(reagent_item)
                            })
                        }
                    } else {
                        v_CombinedMethod.reagent_items.map(reagent_item => {
                            reagentItems.push(reagent_item)
                        })
                    }
                    /**
                     * TODO hack to group-merge
                     * @type {number}
                     */
                    combinedMethod.reagent_items = reagentItems.concat([...method.reagent_items.filter(reagent_item => reagent_item.asset_class !== 'VANILLA')]);
                    /**
                     * Create tranches
                     */
                    let tranches = [];
                    let tranchesByAssetClass = groupBy(combinedMethod.reagent_items, 'asset_class');
                    for (const property in tranchesByAssetClass) {
                        if (tranchesByAssetClass.hasOwnProperty(property)) {
                            tranches.push({asset_class: property, count: tranchesByAssetClass[property].length, tranche_items: tranchesByAssetClass[property]});
                        }
                    }
                    combinedMethod.reagents = combinedMethod.reagent_items.map(({_id, quantity}) => {{return {_id: _id, quantity: quantity}}});
                    combinedMethod.tranches = tranches;
                    /**
                     * Add every vanilla_CartesianProduct
                     * (combined method) to result array
                     */
                    pricing_methods.push(combinedMethod);
                }
            }
        }
        return pricing_methods;
    } catch (error) {
        console.log(error);
    }
}

module.exports = getDerivativeMethods;