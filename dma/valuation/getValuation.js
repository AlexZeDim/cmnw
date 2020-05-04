const items_db = require("../../db/items_db");
const auctions_db = require("../../db/auctions_db");
const getPricingMethods = require("./getPricingMethods");
const groupBy = require('lodash/groupBy');

Array.prototype.addItemToReagentsItems = function(item = {
    _id: 152509,
    asset_class: 'VANILLA',
    quantity: 1
}) {
    let itemExists = this.some(element => element._id === item._id);
    if (itemExists) {
        let reagent_item = this.find(element => element._id === item._id);
        reagent_item.quantity = reagent_item.quantity + item.quantity;
    } else {
        this.push(item);
    }
    return this;
};

Array.prototype.removeItemFromReagentsItems = function(item = {
    _id: 152509,
    asset_class: 'VANILLA',
    quantity: 1
}) {
    let itemExists = this.some(element => element._id === item._id);
    if (itemExists) {
        let reagent_itemIndex = this.findIndex(element => element._id === item._id);
        this.splice(reagent_itemIndex, 1);
    }
    return this;
};

Array.prototype.addItemToTranchesByAssetClass = function(item = {
    _id: 152509,
    asset_class: 'VANILLA',
    quantity: 1
}) {
    let trancheExist = this.some(element => element.asset_class === item.asset_class);
    if (trancheExist) {
        let tranche = this.find(element => element.asset_class === item.asset_class);
        let reagent_item = tranche.reagent_items.find(element => element._id === item._id);
        if (reagent_item) {
            reagent_item.quantity = reagent_item.quantity + item.quantity;
        } else {
            tranche.count += 1;
            tranche.reagent_items.push(item)
        }
    } else {
        this.push({asset_class: item.asset_class, count: 1, reagent_items: [item]});
    }
    return this;
};

Array.prototype.removeItemFromTranchesByAssetClass = function(item = {
    _id: 152509,
    asset_class: 'COMMDTY',
    quantity: 1
}) {
    let tranche = this.some(element => element.asset_class === item.asset_class );
    if (tranche) {
        let trancheIndex = this.findIndex(element => element.asset_class === item.asset_class);
        if (this[trancheIndex].count === 1) {
            this.splice(trancheIndex, 1);
        } else {
            let reagent_itemIndex = this[trancheIndex].reagent_items.findIndex(element => element._id === item._id);
            this[trancheIndex].count = this[trancheIndex].count - 1;
            this[trancheIndex].reagent_items.splice(reagent_itemIndex, 1);
        }
    }
    return this
};

async function getValuation (item = {
    _id: 169451,
    __v: 0,
    icon: 'https://render-eu.worldofwarcraft.com/icons/56/inv_misc_potionsetf.jpg',
    ilvl: 120,
    inventory_type: 'Non-equippable',
    is_equippable: false,
    is_stackable: true,
    item_class: 'Consumable',
    item_subclass: 'Potion',
    level: 100,
    name: {
        en_US: 'Abyssal Healing Potion',
        es_MX: 'Poción de sanación abisal',
        pt_BR: 'Poção de Cura Abissal',
        de_DE: 'Abyssischer Heiltrank',
        en_GB: 'Abyssal Healing Potion',
        es_ES: 'Poción de sanación abisal',
        fr_FR: 'Potion de soins abyssale',
        it_IT: 'Pozione di Cura Abissale',
        ru_RU: 'Глубоководное лечебное зелье'
    },
    quality: 'Common',
    sell_price: 0.12,
    is_commdty: true,
    is_auctionable: true,
    profession_class: 'ALCH',
    asset_class: 'VANILLA',
    expansion: 'BFA',
    ticker: 'POTION.HP'
    }, connected_realm_id = 1602) {
    try {

        let result = {};

        const assetClassMap = new Map([
            ['CONST', 0],
            ['COMMDTY', 1],
            ['INDX', 2],
            ['VANILLA', 3],
            ['PREMIUM', 4],
        ]);


        if (typeof item !== 'object') {
            new SyntaxError(`no`)
            //TODO ANYWAY WE HAVE ITEMS HERE SO
        }
        //TODO check asset_class as REQUEST VALUATION OR NOT

        let {lastModified} = await auctions_db.findOne({connected_realm_id: connected_realm_id}).sort('-lastModified');

        switch (item.asset_class) {
            case 'CONST':
                console.log(item.purchase_price);
                //TODO request buyprice
                break;
            case 'COMMDTY':
                result.market = {};
                if (!lastModified) {
                    ({lastModified} = await auctions_db.findOne({ "item.id": item._id, connected_realm_id: connected_realm_id}).sort({lastModified: -1}));
                }
                result.market.lastModified = lastModified;
                //IDEA if first arg = true => pricing?
                //TODO check valuationsDB
                await auctions_db.aggregate([
                    {
                        $match: {
                            lastModified: lastModified,
                            "item.id": item._id,
                            connected_realm_id: connected_realm_id,
                        }
                    },
                    {
                        $project: {
                            _id: "$lastModified",
                            id: "$id",
                            quantity: "$quantity",
                            price: {$ifNull: ["$buyout", {$ifNull: ["$bid", "$unit_price"]}]},
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            price: {$min: "$price"},
                            price_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", {$min: "$price"}]}},
                        }
                    }
                ]).then(([{price, price_size}]) => {
                    if (price_size) {
                        result.market.price_size = price_size;
                        console.log(price_size)
                        //TODO return
                    } else {
                        result.market.price = price;
                        console.log(price)
                        //TODO return
                    }
                });
                break;
            case 'INDX':
                    //TODO indexPricing
                break;
            case 'VANILLA':
                result.market = {};
                result.model = {};
                result.model.valuations = [];

/*                if (!lastModified) {
                    ({lastModified} = await auctions_db.findOne({ "item.id": item._id, connected_realm_id: connected_realm_id}).sort({lastModified: -1}));
                }

                await auctions_db.aggregate([
                    {
                        $match: {
                            lastModified: lastModified,
                            "item.id": item._id,
                            connected_realm_id: connected_realm_id,
                        }
                    },
                    {
                        $project: {
                            _id: "$lastModified",
                            id: "$id",
                            quantity: "$quantity",
                            price: {$ifNull: ["$buyout", {$ifNull: ["$bid", "$unit_price"]}]},
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            price: {$min: "$price"},
                            price_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", {$min: "$price"}]}},
                        }
                    }
                ]).then(([{price, price_size}]) => {
                    if (price_size) {
                        result.market.price_size = price_size;
                        //TODO return
                    }
                    if (price) {
                        result.market.price = price;
                        //TODO return
                    }
                    result.market.lastModified = lastModified;
                });*/
                //TODO MARKET
                let professions_methods = await getPricingMethods(item._id);
                let pricing_methods = [];
                /**
                 _id: 13957,
                 quantity: [ 1, 1 ],
                 spell_id: 252390,
                 item_id: 163082,
                 item_quantity: 1,
                 reagents_items: [ [Object], [Object] ]
                 */
                for (let method of professions_methods) {
                    if (method.reagent_items.some(ri => ri.asset_class !== 'VANILLA')) {
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
                    }
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
                    for await (let vanilla_ItemCombination of vanilla_ReagentItems.map(({_id, quantity}, i) =>
                        getPricingMethods(_id).then(vanilla_PricingMethods => {
                            for (let vanilla_Method of vanilla_PricingMethods) {
                                for (let r_item of vanilla_Method.reagent_items) {
                                    /**
                                     * We need to change reagent_items quantity
                                     * according to vanilla_item quantity
                                     * TODO check quantity
                                     * @type {number}
                                     */
                                    r_item.quantity = parseFloat((quantity / r_item.quantity).toFixed(3));
                                }
                            }
                            /**
                             * We need to add the vanilla item itself only and
                             * only if he has pricing on auction house via cloning of original method.
                             * TODO push vanilla only if isAuctionable! (unsure)
                             */
                            let cloneMethod = Object.assign({}, method);
                            cloneMethod.reagent_items = [vanilla_ReagentItems[i]];
                            vanilla_PricingMethods.push(cloneMethod);
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

                    for (let v_CombinedMethod of vanilla_CartesianProduct) {
                        /**
                         * Create clones of current method for all Cartesian product
                         */
                        let combinedMethod = Object.assign({}, method);
                        combinedMethod.reagent_items = [...method.reagent_items.filter(reagent_item => reagent_item.asset_class !== 'VANILLA')];
                        /**
                         * Taking pricing method for every VANILLA item
                         * from combinations and it's reagent_items
                         */
                        for (let v_combination of v_CombinedMethod) {
                            /**
                             * Each reagent_item from each vanilla item
                             * pricing method added to cloned reagent_items method
                             */
                            v_combination.reagent_items.map(reagent_item => {
                                combinedMethod.reagent_items.addItemToReagentItems(reagent_item)
                            })
                        }
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
                        combinedMethod.tranches = tranches;
                        /**
                         * Add every vanilla_CartesianProduct
                         * (combined method) to result array
                         */
                        pricing_methods.push(combinedMethod);
                    }
                }
                console.log('====')
                //console.log(pricing_methods);
                console.log('====')

                for (let {tranches} of pricing_methods) {

                    tranches.sort((a, b) => assetClassMap.get(a.asset_class) - assetClassMap.get(b.asset_class));

                    let vanilla_QCost = 0;

                    for (let {asset_class, count, tranche_items} of tranches) {
                        switch (asset_class) {
                            case 'CONST':
                                //TODO async reagent_items, summ of QCost
                                for (let tranche_item of tranche_items) {
                                    vanilla_QCost += parseFloat((tranche_item.purchase_price * tranche_item.quantity).toFixed(2));
                                }
                                break;
                            case 'COMMDTY':
                                //TODO async reagent_items, summ of QCost
                                for (let tranche_item of tranche_items) {
                                    //TODO valuation, if not then AH request
                                    await auctions_db.aggregate([
                                        {
                                            $match: {
                                                lastModified: lastModified,
                                                "item.id": tranche_item._id,
                                                connected_realm_id: connected_realm_id,
                                            }
                                        },
                                        {
                                            $project: {
                                                _id: "$lastModified",
                                                id: "$id",
                                                quantity: "$quantity",
                                                price: {$ifNull: ["$buyout", {$ifNull: ["$bid", "$unit_price"]}]},
                                            }
                                        },
                                        {
                                            $group: {
                                                _id: "$_id",
                                                price: {$min: "$price"},
                                                price_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", {$min: "$price"}]}},
                                            }
                                        }
                                    ]).then(([{price, price_size}]) => {
                                        if (price_size) {
                                            vanilla_QCost += parseFloat((price_size * tranche_item.quantity).toFixed(2));
                                        } else {
                                            vanilla_QCost += parseFloat((price * tranche_item.quantity).toFixed(2));
                                        }
                                    });
                                }
                                break;
                            case 'INDX':
                                for (let tranche_item of tranche_items) {
                                    vanilla_QCost += 0;
                                }
                                break;
                            case 'VANILLA':
                                //TODO valuation, if not then AH request
                                for (let tranche_item of tranche_items) {
                                    vanilla_QCost += 0;
                                }
                                break;
                            case 'PREMIUM':
                                break;
                        }
                    }

                    result.model.valuations.push({
                        name: _id,
                        pricing_method_id: _id,
                        pricing_method: { _id: _id, item_quantity: item_quantity, tranches: tranches },
                        quene_quantity: item_quantity,
                        quene_cost: vanilla_QCost,
                        premium: 0, //TODO
                        nominal_value: 0, //TODO
                        underlying: 0, //TODO
                        lastModified: lastModified
                    });


                }

                //result.model.cheapest_to_delivery = result.model.valuations.reduce((prev, curr) => prev.underlying < curr.underlying ? prev : curr);
                break;
            case 'PREMIUM':
                /***
                 * TODO syntetics request in valuations
                 */
                break;
            default:
        }
        return result;
    } catch (err) {
        console.error(`${getValuation.name},${err}`);
    }
}

module.exports = getValuation;