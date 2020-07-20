/**
 * Model importing
 */

const items_db = require("../../../db/items_db");

/**
 * IVA pricing
 * @type {itemValuationAdjustment}
 */

const itemValuationAdjustment = require('./IVA');

/**
 * This function evaluate any item with asset_classes property on certain realm
 * TODO XVA last_modified for IVA
 * @param query
 * @param connected_realm_id
 * @returns {Promise<void>}
 * @constructor
 */

async function XVA (query = {expansion: "BFA"}, connected_realm_id = 1602) {
    try {
        /**
         * Asset Class hierarchy map
         * @type {Map<number, string[]>}
         */
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
            let allowCap = false
            console.time(`DMA-${XVA.name}-${connected_realm_id}-${k}:${ac.toString()}`);
            if (k === 2 ||k === 3 || k === 4) {
                allowCap = true
            }
            Object.assign(query, {asset_class: { "$all": ac }})
            await items_db.find(query).cursor({batchSize: 10}).eachAsync(async (item) => {
                console.time(`DMA-${item._id}-${connected_realm_id}:${item.name.en_GB}`)
                await itemValuationAdjustment(item, connected_realm_id, null, 0, 0, allowCap)
                console.timeEnd(`DMA-${item._id}-${connected_realm_id}:${item.name.en_GB}`)
            }, { parallel: 10 })
            console.timeEnd(`DMA-${XVA.name}-${connected_realm_id}-${k}:${ac.toString()}`);
        }
    } catch (err) {
        console.error(`${XVA.name},${err}`);
    }
}

module.exports = XVA;