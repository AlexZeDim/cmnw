
Array.prototype.addItemToTranchesByAssetClass = function(item = {
    _id: 152509,
    asset_class: 'VANILLA',
    quantity: 1
}) {
    let tranche = this.find(element => element.asset_class === item.asset_class); //TODO some
    if (tranche) {
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

let f = (a, b) => [].concat(...a.map(a => b.map(b => [].concat(a, b))));
let cartesian = (a, b, ...c) => b ? cartesian(f(a, b), ...c) : a;

let output = cartesian([1,2],[10,20],[100,200,300], [1000, 2000]);

//console.log(output);

let f_ = (a, b) => [].concat(...a.map(a => b.map(b => [].concat(a, b))));
//let cartesianO = (a, b, ...c) => b ? cartesianO(f_(a, b), ...c) : a;

let data = [
    [
        { _id: 252384, item_quantity: 1, tranches: [
                { asset_class: 'CONST', count: 1, reagent_items: [ {
                        asset_class: 'CONST',
                        count: 1,
                        reagent_items: [
                            {
                                _id: 3371,
                                __v: 0,
                                icon: 'https://render-eu.worldofwarcraft.com/icons/56/inv_alchemy_leadedvial.jpg',
                                ilvl: 1,
                                inventory_type: 'Non-equippable',
                                is_equippable: false,
                                is_stackable: true,
                                item_class: 'Tradeskill',
                                item_subclass: 'Other',
                                level: 0,
                                name: [Object],
                                quality: 'Common',
                                sell_price: 0,
                                is_commdty: true,
                                is_auctionable: true,
                                expansion: 'BFA',
                                ticker: 'u/r',
                                profession_class: 'ALCH',
                                asset_class: 'CONST',
                                purchase_price: 0.01,
                                quantity: 2
                            }
                        ]
                    } ] },
                { asset_class: 'COMMDTY', count: 1, reagent_items: [ {
                        asset_class: 'COMMDTY',
                        count: 1,
                        reagent_items: [
                            {
                                _id: 152505,
                                __v: 0,
                                icon: 'https://render-eu.worldofwarcraft.com/icons/56/inv_misc_herb_riverbud.jpg',
                                ilvl: 111,
                                inventory_type: 'Non-equippable',
                                is_equippable: false,
                                is_stackable: true,
                                item_class: 'Tradeskill',
                                item_subclass: 'Herb',
                                level: 0,
                                name: [Object],
                                quality: 'Common',
                                sell_price: 0,
                                is_commdty: true,
                                is_auctionable: true,
                                expansion: 'BFA',
                                ticker: 'RVBD',
                                profession_class: 'HRBS',
                                asset_class: 'COMMDTY',
                                purchase_price: 0,
                                quantity: 1
                            }
                        ]
                    } ] }
            ] },
        { _id: 252390, item_quantity: 1, tranches: [ {
                asset_class: 'VANILLA',
                count: 1,
                reagent_items: [{
                    _id: 152495,
                    __v: 0,
                    icon: 'https://render-eu.worldofwarcraft.com/icons/56/inv_alchemy_80_potion01blue.jpg',
                    ilvl: 120,
                    inventory_type: 'Non-equippable',
                    is_equippable: false,
                    is_stackable: true,
                    item_class: 'Consumable',
                    item_subclass: 'Potion',
                    level: 100,
                    name: {
                        en_US: 'Coastal Mana Potion',
                        es_MX: 'Poción de maná costera',
                        pt_BR: 'Poção de Mana Costeira',
                        de_DE: 'Manatrank der Küste',
                        en_GB: 'Coastal Mana Potion',
                        es_ES: 'Poción de maná costera',
                        fr_FR: 'Potion de mana côtière',
                        it_IT: 'Pozione Costiera di Mana',
                        ru_RU: 'Береговое зелье маны'
                    },
                    quality: 'Common',
                    sell_price: 0.6,
                    is_commdty: true,
                    is_auctionable: true,
                    expansion: 'BFA',
                    ticker: 'J.POTION.MANA',
                    profession_class: 'ALCH',
                    asset_class: 'VANILLA',
                    purchase_price: 2.4,
                    quantity: 1
                }]
            } ] }
    ],
    [
        { _id: 252387, item_quantity: 1, tranches: [
                { asset_class: 'CONST', count: 1, reagent_items: [ {
                        asset_class: 'CONST',
                        count: 1,
                        reagent_items: [
                            {
                                _id: 3371,
                                __v: 0,
                                icon: 'https://render-eu.worldofwarcraft.com/icons/56/inv_alchemy_leadedvial.jpg',
                                ilvl: 1,
                                inventory_type: 'Non-equippable',
                                is_equippable: false,
                                is_stackable: true,
                                item_class: 'Tradeskill',
                                item_subclass: 'Other',
                                level: 0,
                                name: [Object],
                                quality: 'Common',
                                sell_price: 0,
                                is_commdty: true,
                                is_auctionable: true,
                                expansion: 'BFA',
                                ticker: 'u/r',
                                profession_class: 'ALCH',
                                asset_class: 'CONST',
                                purchase_price: 0.01,
                                quantity: 2
                            }
                        ]
                    } ] },
                { asset_class: 'COMMDTY', count: 1, reagent_items: [ {
                        asset_class: 'COMMDTY',
                        count: 1,
                        reagent_items: [
                            {
                                _id: 152509,
                                __v: 0,
                                icon: 'https://render-eu.worldofwarcraft.com/icons/56/inv_misc_herb_pollen.jpg',
                                ilvl: 111,
                                inventory_type: 'Non-equippable',
                                is_equippable: false,
                                is_stackable: true,
                                item_class: 'Tradeskill',
                                item_subclass: 'Herb',
                                level: 0,
                                name: [Object],
                                quality: 'Common',
                                sell_price: 0,
                                is_commdty: true,
                                is_auctionable: true,
                                expansion: 'BFA',
                                ticker: 'SRNP',
                                profession_class: 'HRBS',
                                asset_class: 'COMMDTY',
                                purchase_price: 0,
                                quantity: 1
                            }
                        ]
                    } ] }
            ] },
        { _id: 252390, item_quantity: 1, tranches: [ {
                asset_class: 'VANILLA',
                count: 1,
                reagent_items: [{
                    _id: 152494,
                    __v: 0,
                    icon: 'https://render-eu.worldofwarcraft.com/icons/56/inv_alchemy_80_potion01red.jpg',
                    ilvl: 120,
                    inventory_type: 'Non-equippable',
                    is_equippable: false,
                    is_stackable: true,
                    item_class: 'Consumable',
                    item_subclass: 'Potion',
                    level: 100,
                    name: {
                        en_US: 'Coastal Healing Potion',
                        es_MX: 'Poción de sanación costera',
                        pt_BR: 'Poção de Cura Costeira',
                        de_DE: 'Heiltrank der Küste',
                        en_GB: 'Coastal Healing Potion',
                        es_ES: 'Poción de sanación costera',
                        fr_FR: 'Potion de soins côtière',
                        it_IT: 'Pozione Costiera di Cura',
                        ru_RU: 'Береговое лечебное зелье'
                    },
                    quality: 'Common',
                    sell_price: 0.12,
                    is_commdty: true,
                    is_auctionable: true,
                    expansion: 'BFA',
                    ticker: 'J.POTION.HP',
                    profession_class: 'ALCH',
                    asset_class: 'VANILLA',
                    purchase_price: 2.4,
                    quantity: 1
                }]
            }] }
    ]
];

let result = data.reduce((a, b) => a.reduce((r, v) => r.concat(b.map(w => [].concat(v, w))), []));

console.log(result);