const items_db = require("../../db/items_db");
const pricing_db = require("../../db/pricing_db");
const auctions_db = require("../../db/auctions_db");
const getMethods = require("./getMethods");

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

async function getPricing (item = {
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
                let pricing_methods = await getMethods(item._id);
                /**
                 *
                 _id: 13957,
                 quantity: [ 1, 1 ],
                 spell_id: 252390,
                 item_id: 163082,
                 item_quantity: 1,
                 reagents_items: [ [Object], [Object] ]
                 */
                for (const [index, method] of pricing_methods.entries()) {
                    //TODO some? if Y -> remove method
                    /**
                     * We filter reagents_items to receive all
                     * VANILLA items inside of it.
                     * @type {Array}
                     */
                    let reagent_items = [...method.reagents_items.filter(reagent_item => reagent_item.asset_class === 'VANILLA')];
                    let vanilla_MethodsCombinations = [];
                    /**
                     * We request pricingMethods for
                     * every VANILLA item inside
                     * default method reagent_item
                     */
                    for await (let vanilla_ItemCombination of reagent_items.map(({_id, quantity}, i) =>
                        getMethods(_id).then(vanilla_PricingMethods => {
                            for (let vanilla_Method of vanilla_PricingMethods) {
                                for (let r_item of vanilla_Method.reagents_items) {
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
                             * TODO now sure that we clone the right method
                             * TODO remove vanilla items post-factum
                             */
                            let cloneMethod = Object.assign({}, method);
                            cloneMethod.reagents_items = [reagent_items[i]];
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
                     * This code is provided by
                     */
                    let vanilla_CartesianProduct = vanilla_MethodsCombinations.reduce((a, b) => a.reduce((r, v) => r.concat(b.map(w => [].concat(v, w))), []));
                    for (let v_CombinedMethod of vanilla_CartesianProduct) {
                        let combinedMethod = Object.assign({}, method);
                        console.log(combinedMethod);
                        //console.log('-----');
                        //TODO clone
/*                        for (let v_combination of v_CombinedMethod) {
                            //TODO we need clone because not vanilla
                            //TODO push to reagent_items && we dont' need clone method
                            console.log(v_combination.reagents_items);
                        }*/
                    }
                }
/*                let pricing_methods = await getMethods(item._id).then(async pricing_methods => {
                    return await Promise.all(pricing_methods.map(async ({_id, item_quantity, tranches}, i) => {
                        tranches = await tranches.filter(({asset_class}) => asset_class === 'VANILLA');
                        return await Promise.all(tranches.map(async ({asset_class, count, reagent_items}) => {
                            pricing_methods.splice(i, 1);
                            return await Promise.all(reagent_items.map(async reagent_item => {
                                return await getMethods(reagent_item._id).then(vanilla_PricingMethods => {
                                    vanilla_PricingMethods.push({
                                        _id: _id,
                                        item_quantity: item_quantity,
                                        tranches: [{
                                            asset_class: asset_class,
                                            count: count,
                                            reagent_items: [reagent_item]
                                        }]
                                    });
                                    vanilla_PricingMethods.map(m => {
                                        m.tranches.map(tr => tr.reagent_items.map(r_item => {
                                            r_item.quantity = parseFloat((r_item.quantity * (reagent_item.quantity / m.item_quantity)).toFixed(3))
                                        }))
                                    });
                                    return vanilla_PricingMethods
                                });
                            })).then(vanilla_PricingMethods => {
                                let vanilla_Combinations = vanilla_PricingMethods.reduce((a, b) => a.reduce((r, v) => r.concat(b.map(w => [].concat(v, w))), []));
                                for (let cmb of vanilla_Combinations) {
                                    let cloneMethod = { _id: _id, item_quantity: item_quantity, tranches: [] };
                                    for (let obj of cmb) {
                                        for (let tr of obj.tranches) {
                                            for (let r_item of tr.reagent_items) {
                                                cloneMethod.tranches.addItemToTranchesByAssetClass(r_item)
                                            }
                                        }
                                    }
                                    pricing_methods.push(cloneMethod);
                                }
                                return pricing_methods;
                            });
                        }));
                    }));
                });*/
                console.log('====')
                console.log(pricing_methods);
                console.log('====')
                //TODO we need to add/modify, not create new pricing!

                for (let { _id, item_quantity, tranches } of pricing_methods) {
                    tranches.sort((a, b) => assetClassMap.get(a.asset_class) - assetClassMap.get(b.asset_class));

                    let vanilla_QCost = 0;
                    for (let {asset_class, count, reagent_items, permutation} of tranches) {
                        switch (asset_class) {
                            case 'CONST':
                                //TODO async reagent_items, summ of QCost
                                for (let reagent_item of reagent_items) {
                                    vanilla_QCost += parseFloat((reagent_item.purchase_price * reagent_item.quantity).toFixed(2));
                                }
                                break;
                            case 'COMMDTY':
                                //TODO async reagent_items, summ of QCost
                                for (let reagent_item of reagent_items) {
                                    //TODO valuation, if not then AH request
                                    await auctions_db.aggregate([
                                        {
                                            $match: {
                                                lastModified: lastModified,
                                                "item.id": reagent_item._id,
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
                                            vanilla_QCost += parseFloat((price_size * reagent_item.quantity).toFixed(2));
                                        } else {
                                            vanilla_QCost += parseFloat((price * reagent_item.quantity).toFixed(2));
                                        }
                                    });
                                }
                                break;
                            case 'INDX':
                                for (let reagent_item of reagent_items) {
                                    vanilla_QCost += 0;
                                }
                                break;
                            case 'VANILLA':
                                let perm = [];
                                let perma = [];
                                let permArrayL = 0;
/*                                await Promise.all(reagent_items.map(async reagent_item => {
                                    const vanilla_getPricing = await getPricing(reagent_item, connected_realm_id, false);
                                    perm.push(vanilla_getPricing);
                                    permArrayL += vanilla_getPricing.model.valuations.length;

                                    tranches.removeItemFromTranchesByAssetClass(reagent_item);
                                    for (let x of vanilla_getPricing.model.valuations) {
                                        tranches.addItemToTranchesByAssetClass(reagent_iem);
                                        console.log(x.pricing_method)
                                    }
                                    console.log(tranches)
                                    if (vanilla_getPricing.hasOwnProperty('market')) {
                                        permArrayL += 1;
                                    }
                                }));

                                for (let [index, val] of perm.entries()) {
                                    console.log(val);
                                }

                                let permutations = Array.from({length: permArrayL},() => [...tranches]);
                               for (let [index, val] of permutations.entries()) {

                                }
                                console.log(permutations);*/
                                //console.log(newPermArray, newPermArray.length);
/*                                for (let reagent_item of reagent_items) {
                                    //TODO getPricing return pricing_methods
                                    let cloneTranches = [...tranches];

                                    cloneTranches.removeItemFromTranchesByAssetClass(reagent_item);

                                    let test_vanilla_PricingMethod = [
                                        { _id: 301312, item_quantity: 1, tranches: [ [Object], [Object] ] },
                                        { _id: 301311, item_quantity: 1, tranches: [ [Object], [Object] ] }
                                    ];




                                    cloneTranches.addItemToTranchesByAssetClass({
                                        _id: 152509,
                                        asset_class: 'VANILLA',
                                        quantity: 1
                                    });


                                    for (let vanilla_PricingMethod of test_vanilla_PricingMethod) {
                                        for (let cloneTranche of cloneTranches) {
                                            if (cloneTranche.asset_class === 'VANILLA') {
                                                cloneTranche.count = cloneTranche.count - 1;
                                                if (cloneTranche.count === 0) {
                                                    //TODO quantity for quantity
                                                    //IDEA ALCH quene cost multiply
                                                    //TODO remove VANILLA from CloneTranche
                                                } else {
                                                    //TODO remove just one item from cloneTranche
                                                }

                                            }
                                        }

                                        pricing_methods.push()
                                        //TODO reagent_item._id need to be found and removed
                                    }
                                    //vanillaQCost += 0;
                                }*/
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
        console.error(`${getPricing.name},${err}`);
    }
}

module.exports = getPricing;