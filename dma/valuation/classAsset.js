let tested = [
    { _id: 252384, item_quantity: 1, tranches:
        [
            { asset_class: 'CONST', count: 1, reagent_items: [
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
                        name: {
                            en_US: 'Crystal Vial',
                            es_MX: 'Vial de cristal',
                            pt_BR: 'Ampola de Cristal',
                            de_DE: 'Kristallphiole',
                            en_GB: 'Crystal Vial',
                            es_ES: 'Vial de cristal',
                            fr_FR: 'Fiole de cristal',
                            it_IT: 'Ampolla di Cristallo',
                            ru_RU: 'Хрустальная колба'
                        },
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
                ] },
            { asset_class: 'COMMDTY', count: 2, reagent_items: [
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
                        name: {
                            en_US: "Siren's Pollen",
                            es_MX: 'Polen de sirena',
                            pt_BR: 'Pólen de Sirena',
                            de_DE: 'Sirenenpollen',
                            en_GB: "Siren's Pollen",
                            es_ES: 'Polen de sirena',
                            fr_FR: 'Pollen de sirène',
                            it_IT: 'Polline di Sirena',
                            ru_RU: 'Пыльца сирены'
                        },
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
                    },
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
                        name: {
                            en_US: 'Crystal Vial',
                            es_MX: 'Vial de cristal',
                            pt_BR: 'Ampola de Cristal',
                            de_DE: 'Kristallphiole',
                            en_GB: 'Crystal Vial',
                            es_ES: 'Vial de cristal',
                            fr_FR: 'Fiole de cristal',
                            it_IT: 'Ampolla di Cristallo',
                            ru_RU: 'Хрустальная колба'
                        },
                        quality: 'Common',
                        sell_price: 0,
                        is_commdty: true,
                        is_auctionable: true,
                        expansion: 'BFA',
                        ticker: 'u/r',
                        profession_class: 'ALCH',
                        asset_class: 'COMMDTY',
                        purchase_price: 0.01,
                        quantity: 2
                    }
                ] }
        ]
    }
];

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

console.log(tested[0].tranches.addItemToTranchesByAssetClass({
    _id: 152509,
    asset_class: 'VANILLA',
    quantity: 1
}));

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

console.log(tested[0].tranches.removeItemFromTranchesByAssetClass({
    _id: 152509,
    asset_class: 'COMMDTY',
    quantity: 1
}));

