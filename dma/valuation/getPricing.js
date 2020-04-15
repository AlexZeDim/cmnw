const items_db = require("../../db/items_db");
const pricing_db = require("../../db/pricing_db");
const auctions_db = require("../../db/auctions_db");

//TODO do it recursive?

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
    }, connected_realm_id = 1602, first = true) {
    try {

        const assetClassMap = new Map([
            ['CONST', 0],
            ['COMMDTY', 1],
            ['INDX', 2],
            ['VANILLA', 3],
            ['PREMIUM', 4],
        ]);

        let evaArrayPromise = [];

        if (typeof item !== 'object') {
            new Error(`no`)
            //TODO ANYWAY WE HAVE ITEMS HERE SO
        }
        //TODO check asset_class as REQUEST VALUATION OR NOT

        let lastModified = await auctions_db.findOne({connected_realm_id: connected_realm_id}).sort('-lastModified');

        switch (item.asset_class) {
            case 'CONST':
                console.log(item.purchase_price);
                //TODO request buyprice
                break;
            case 'COMMDTY':
                if (!lastModified) {
                    ({lastModified} = await auctions_db.findOne({ "item.id": item._id, connected_realm_id: connected_realm_id}).sort({lastModified: -1}));
                }
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
                        console.log(price_size)
                        //TODO return
                    } else {
                        console.log(price)
                        //TODO return
                    }
                });
                break;
            case 'INDX':
                    //TODO indexPricing
                break;
            case 'VANILLA':
                let pricing_methods = await pricing_db.aggregate([
                    {
                        $match: {
                            item_id: item.id, rank: {$exists: true, $eq: 3}
                        }
                    },
                    {
                        $lookup: {
                            from: "items",
                            localField: "reagents",
                            foreignField: "_id",
                            as: "reagents_items"
                        }
                    },
                    {
                        $project: {
                            "item_id" : 1,
                            reagents_items: 1,
                            spell_id: 1,
                            quantity: 1,
                            item_quantity: 1,
                        }
                    },
                    {
                        $addFields: {
                            reagents_items: {
                                $map: {
                                    input: {
                                        $zip: {
                                            inputs: [
                                                "$quantity",
                                                "$reagents_items"
                                            ]
                                        }
                                    },
                                    as: "reagents_items",
                                    in: {
                                        $mergeObjects: [
                                            {
                                                $arrayElemAt: [
                                                    "$$reagents_items",
                                                    1
                                                ]
                                            },
                                            {
                                                quantity: {
                                                    $arrayElemAt: [
                                                        "$$reagents_items",
                                                        0
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$reagents_items"
                    },
                    {
                        $group: {
                            _id: {spell_id: "$spell_id", asset_class: "$reagents_items.asset_class", item_quantity: "$item_quantity"},
                            count: { $sum: 1 },
                            reagents: { $addToSet: "$reagents_items" },
                        }
                    },
                    {
                        $project: {
                            _id: "$_id.spell_id",
                            item_quantity: "$_id.item_quantity",
                            tranche: { asset_class: "$_id.asset_class", count: "$count", reagent_items: "$reagents"},
                        }
                    },
                    {
                        $group: {
                            _id: {spell_id: "$_id", item_quantity: "$item_quantity"},
                            tranche: { $addToSet: "$tranche" },
                        }
                    },
                    {
                        $project: {
                            _id: "$_id.spell_id",
                            item_quantity: "$_id.item_quantity",
                            tranches: "$tranche",
                        }
                    },
                ]);
                for (let {tranches} of pricing_methods) {
                    tranches.sort((a, b) => assetClassMap.get(a.asset_class) - assetClassMap.get(b.asset_class));
                    let vanillaQCost = 0;
                    for (let {asset_class, count, reagent_items} of tranches) {
                        switch (asset_class) {
                            case 'CONST':
                                //TODO async reagent_items, summ of QCost
                                for (let reagent_item of reagent_items) {
                                    vanillaQCost += parseFloat((reagent_item.purchase_price * reagent_item.quantity).toFixed(2));
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
                                            vanillaQCost += parseFloat((price_size * reagent_item.quantity).toFixed(2));
                                        } else {
                                            vanillaQCost += parseFloat((price * reagent_item.quantity).toFixed(2));
                                        }
                                    });
                                }
                                break;
                            case 'INDX':
                                for (let reagent_item of reagent_items) {
                                    vanillaQCost += 0;
                                }
                                break;
                            case 'VANILLA':
                                for (let reagent_item of reagent_items) {
                                    //TODO getPricing return pricing_methods
                                    let test_vanilla_PricingMethod = [
                                        { _id: 301312, item_quantity: 1, tranches: [ [Object], [Object] ] },
                                        { _id: 301311, item_quantity: 1, tranches: [ [Object], [Object] ] }
                                    ];
                                    for (let vanilla_PricingMethod of test_vanilla_PricingMethod) {
                                        let cloneTranches = [...tranches];

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
                                }
                                break;
                            case 'PREMIUM':
                                break;
                        }
                    }
                }

                if (!lastModified) {
                    ({lastModified} = await auctions_db.findOne({ "item.id": item._id, connected_realm_id: connected_realm_id}).sort({lastModified: -1}));
                }
                //TODO
                break;
            case 'PREMIUM':
                /***
                 * TODO syntetics request in valuations
                 */
                break;
            default:
            /***
             * TODO return market price or rito
             */
        }

        //FIXME r3
        let valuation_query = {item_id: _id, rank: { $exists: true, $eq: 3 }};
        evaArrayPromise.push(pricing_db.find(valuation_query).lean());

        if (is_auctionable) {
            ({lastModified} = await auctions_db.findOne({ "item.id": _id, connected_realm_id: connected_realm_id}).sort({lastModified: -1}));
            evaArrayPromise.push(
                auctions_db.aggregate([
                    {
                        $match: {
                            lastModified: lastModified,
                            "item.id": _id,
                            connected_realm_id: connected_realm_id,
                        }
                    },
                    {
                        $project: {
                            _id: "$lastModified",
                            id: "$id",
                            quantity: "$quantity",
                            price: { $ifNull: [ "$buyout", { $ifNull: [ "$bid", "$unit_price" ] } ] },
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            price: {$min: "$price"},
                            price_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", {$min: "$price"}]}},
                        }
                    }
                ]).then(([data]) => {return data})
            );
        }

        let result = {
            _id: `${_id}@${connected_realm_id}`,
            item_id: _id,
            connected_realm_id: connected_realm_id,
        };

        let [pricing, auctions_data] = await Promise.all(evaArrayPromise);

        if (is_auctionable) {
            result.market = {
                lastModified: auctions_data._id,
                price: auctions_data.price,
                price_size: auctions_data.price_size
            };
        }

        let valuations = [];
        if (pricing) {
            for (let method of pricing) { //rank
                let {reagents, quantity, item_quantity, spell_id} = method;
                if (reagents.length !== quantity.length) {
                    new Error('shit')
                }
                let valuation = {
                    name: spell_id,
                    pricing_method_id: spell_id,
                    pricing_method: []
                };
                let reagents_items = await Promise.all(reagents.map( async (id, i) => {
                    let item = await items_db.findById(id).lean();
                    Object.assign(item, {quantity: quantity[i]});
                    return item
                }));
                let assetClass = new Map([
                    ['CONST', 0],
                    ['COMMDTY', 1],
                    ['INDX', 2],
                    ['VANILLA', 3],
                    ['PREMIUM', 4],
                ]);
                reagents_items.sort((a, b) => assetClass.get(a.asset_class) - assetClass.get(b.asset_class));
                let quene_cost = 0;
                let premium_count = 0;
                for (let [i, item_reagents] of reagents_items.entries()) {
                    let pricing_method = {};
                    let {_id, name, ticker, quantity, asset_class, purchase_price} = item_reagents;
                    pricing_method.id = _id;
                    (ticker) ? (pricing_method.name = ticker) : (pricing_method.name = name.en_GB);
                    pricing_method.quantity = quantity;
                    pricing_method.asset_class = asset_class;
                    switch (asset_class) {
                        case 'CONST':
                            //FIXME buyprice not sell
                            pricing_method.price = purchase_price;
                            pricing_method.value = parseFloat((purchase_price * quantity).toFixed(2));
                            quene_cost += parseFloat((purchase_price * quantity).toFixed(2));
                            valuation.pricing_method.push(pricing_method);
                            break;
                        case 'COMMDTY':
                            if (!lastModified) {
                                ({lastModified} = await auctions_db.findOne({ "item.id": _id, connected_realm_id: connected_realm_id}).sort({lastModified: -1}));
                            }
                            await auctions_db.aggregate([
                                {
                                    $match: {
                                        lastModified: lastModified,
                                        "item.id": _id,
                                        connected_realm_id: 1602,
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
                                    pricing_method.price = price_size;
                                    pricing_method.value = parseFloat((price_size * quantity).toFixed(2));
                                    quene_cost += parseFloat((price_size * quantity).toFixed(2));
                                    valuation.pricing_method.push(pricing_method);
                                } else {
                                    pricing_method.price = price;
                                    pricing_method.value = parseFloat((price * quantity).toFixed(2));
                                    quene_cost += parseFloat((price * quantity).toFixed(2));
                                    valuation.pricing_method.push(pricing_method);
                                }
                            });
                            break;
                        case 'INDX':
                            pricing_method.price = 0;
                            pricing_method.value = 0;
                            quene_cost += 0;
                            valuation.pricing_method.push(pricing_method);
                            break;
                        case 'VANILLA':
                            let vanilla_ArrayPromise = [];
                            vanilla_ArrayPromise.push(pricing_db.find({item_id: _id, rank: { $exists: true, $eq: 3 }}).lean());

                            if (!lastModified) {
                                ({lastModified} = await auctions_db.findOne({ "item.id": _id, connected_realm_id: connected_realm_id}).sort({lastModified: -1}));
                            }
                            vanilla_ArrayPromise.push(
                                auctions_db.aggregate([
                                    {
                                        $match: {
                                            lastModified: lastModified,
                                            "item.id": _id,
                                            connected_realm_id: connected_realm_id,
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: "$lastModified",
                                            id: "$id",
                                            quantity: "$quantity",
                                            price: { $ifNull: [ "$buyout", { $ifNull: [ "$bid", "$unit_price" ] } ] },
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: "$_id",
                                            price: {$min: "$price"},
                                            price_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", {$min: "$price"}]}},
                                        }
                                    }
                                ]).then(([data]) => {return data})
                            );

                            let [vanilla_pricing, vanilla_auctions_data] = await Promise.all(vanilla_ArrayPromise);
                            //pricing

                            //TODO clone array => remove id and push new one (merge), same for qnty
 /*                           pricing.push({
                                _id: method._id,
                                quantity: method.quantity,
                                reagents: method.reagents,
                                spell_id: method.spell_id,
                                rank: method.rank,
                                item_id: method.item_id,
                                item_quantity: method.item_quantity
                            });*/

                            //console.log(pricing, _id, vanilla_pricing);
/*                            console.log(method);
                            console.log(pricing.length);*/

                            let v_method = { ...method };

                            for (let vanilla_method of vanilla_pricing) {
                                let method_reagents = Array.from(method.reagents);
                                let method_quantity = Array.from(method.quantity);
                                let t = method_reagents.indexOf(_id);
                                if (t !== -1) {
                                    method_reagents.splice(t, 1);
                                    method_quantity.splice(t, 1);
                                }
                                console.log(method_reagents.concat(vanilla_method.reagents));
                                console.log(method_quantity.concat(vanilla_method.quantity));
/*                                method.reagents.forEach((v_item, i) => {
                                    if (v_item !== _id) {
                                        v_method.reagents = v_method.reagents.splice(i, 1).concat(vanilla_method.reagents);
                                        v_method.quantity = v_method.quantity.splice(i, 1).concat(vanilla_method.quantity);
                                    }
                                });*/
                            //console.log(clone);
/*                                console.log(method.quantity);
                                let arr = method.reagents.filter((item,i) => { if (item === _id) { method.quantity.splice(i, 1)} return item !== _id}).concat(vanilla_method.reagents);
                                let qnty = method.quantity.concat(vanilla_method.quantity);
                                console.log(qnty)*/
                                //console.log(method.reagents, _id, vanilla_method.reagents, arr);
                            }




                            //TODO CHECK PRICING FOR METHODS!
                            //IDEA WE DONT NEED GET PRICING!
                            let {price} = vanilla_auctions_data;
                            pricing_method.price = price;
                            pricing_method.value = parseFloat((price * quantity).toFixed(2));
                            quene_cost += parseFloat((price * quantity).toFixed(2));
                            valuation.pricing_method.push(pricing_method);
                            break;
                        case 'PREMIUM':
                            if (item.asset_class === 'INDX') {
                                /**
                                 * TODO synthetics or reject
                                 *
                                 *
                                 * @type {number}
                                 */
                                valuation.pricing_method = [];
                                quene_cost = 0;
                            } else {
                                if (premium_count === 0) {
                                    premium_count += 1;
                                    if (is_auctionable) {
                                        //pricing_method.premium = (auctions_data.price*item_quantity) - quene_cost;
                                        pricing_method.price = ((auctions_data.price*item_quantity) - quene_cost) / quantity;
                                        pricing_method.value = (auctions_data.price*item_quantity) - quene_cost;
                                        quene_cost += (auctions_data.price*item_quantity) - quene_cost;
                                        valuation.pricing_method.push(pricing_method);
                                    } else {
                                        /**
                                         * TODO price = 0, but synthetics(true/false)?
                                         *  if synthetics => (synthetics && check it in PREMIUM(n))
                                         *  if yes do not price[l-1]
                                         *  pricing_method.price = synthetics
                                         *  pricing_method.value = synthetics * item_quantity
                                         *  premium_count = premium_count-1
                                         *
                                         *
                                         * @type {number}
                                         */
                                        pricing_method.price = 0;
                                        pricing_method.value = 0;
                                        valuation.pricing_method.push(pricing_method);
                                    }
                                } else {
                                    premium_count += 1;
                                    let l = valuation.pricing_method.length;
                                    quene_cost = quene_cost - valuation.pricing_method[l-1].value;
                                    valuation.pricing_method[l-1].price = 0;
                                    valuation.pricing_method[l-1].value = 0;
                                    pricing_method.price = 0;
                                    pricing_method.value = 0;
                                    valuation.pricing_method.push(pricing_method);
                                    if (is_auctionable) {
                                        valuation.premium = parseFloat(((auctions_data.price*item_quantity) - quene_cost).toFixed(2));
                                    }
                                }
                            }
                            break;
                        default:
                            pricing_method.price = 0;
                            pricing_method.value = 0;
                            valuation.pricing_method.push(pricing_method);
                    }
                    /**INSIDE REAGENTS **/
                }
                valuation.quene_quantity = item_quantity;
                (premium_count > 1) ? (valuation.quene_cost = parseFloat(quene_cost.toFixed(2))) : (valuation.quene_cost = parseFloat(quene_cost.toFixed(2)));
                valuation.quene_cost = parseFloat(quene_cost.toFixed(2));
                valuation.underlying = parseFloat((quene_cost / item_quantity).toFixed(2));
                if (is_auctionable) {
                    valuation.nominal_value = parseFloat((auctions_data.price / (quene_cost / item_quantity)).toFixed(2));
                    if (premium_count > 1) {
                        valuation.nominal_value = parseFloat((auctions_data.price / ((quene_cost+valuation.premium) / item_quantity)).toFixed(2));
                    }
                }
                valuation.lastModified = lastModified;
                valuations.push(valuation);
                /**INSIDE PRICING **/
            }
            /** END OF VALUATION **/
            result.valuations = valuations;
            result.cheapest_to_delivery = valuations.reduce((prev, curr) => prev.underlying < curr.underlying ? prev : curr);
        }
        return result;
    } catch (err) {
        console.error(`${getPricing.name},${err}`);
    }
}

module.exports = getPricing;