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
    }, connected_realm_id = 1602) {
    try {
        let lastModified;
        let evaArrayPromise = [];

        if (typeof item !== 'object') {
            new Error(`no`)
            //TODO throw error, checks etc
        }
        let {_id, is_auctionable, asset_class, expansion} = item;
        //TODO check asset_class as REQUEST VALUATION OR NOT

        let valuation_query = {item_id: _id};
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
            for (let {reagents, quantity, item_quantity, spell_id} of pricing) { //rank
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
                    let {_id, name, ticker, quantity, asset_class, sell_price} = item_reagents;
                    pricing_method.id = _id;
                    (ticker) ? (pricing_method.name = ticker) : (pricing_method.name = name.en_GB);
                    pricing_method.quantity = quantity;
                    pricing_method.asset_class = asset_class;
                    switch (asset_class) {
                        case 'CONST':
                            //FIXME buyprice not sell
                            pricing_method.price = sell_price;
                            pricing_method.value = parseFloat((sell_price * quantity).toFixed(2));
                            quene_cost += parseFloat((sell_price * quantity).toFixed(2));
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
                            pricing_method.price = 0;
                            pricing_method.value = 0;
                            quene_cost += 0;
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
                                        valuation.premium = (auctions_data.price*item_quantity) - quene_cost;
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