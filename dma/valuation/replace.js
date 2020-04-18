
async function tested () {
    try {
        console.time(tested.name);
        let methods = [
            { _id: 252389, item_quantity: 1, tranches: [
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
                            quantity: 1
                        }
                    ] },
                    {
                        asset_class: 'VANILLA',
                        count: 2,
                        reagent_items: [
                            {
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
                                quantity: 2
                            },
                            {
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
                                quantity: 2
                            }
                        ]
                    }
                ] }
        ];
        let WeNeedToAdd = [
            { _id: 252383, item_quantity: 1, tranches: [
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
                                quantity: 1
                            }
                        ] },
                    { asset_class: 'COMMDTY', count: 1, reagent_items: [
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
                            }
                        ] }
                ] }
        ];
        for (let method of methods) {
            let cloneTranches = [...method.tranches];
            for (let cloneTranche of cloneTranches) {
                if (cloneTranche.asset_class === 'VANILLA') {
                    cloneTranche.count = cloneTranche.count - 1;

                    if (cloneTranche.count === 0) {
                        let t = cloneTranches.indexOf(cloneTranche);
                        let qnty_WeNeedThatLater = cloneTranche.reagent_items[0].quantity;
                        if (t !== -1) {
                            cloneTranches.splice(t, 1);
                        }
                        //TODO quantity for quantity
                        //IDEA ALCH quene cost multiply
                        //TODO add to tracnhes new items
                    } else {
                        for (let cloneVanillaReagentItem of cloneTranche.reagent_items) {
                            //console.log(cloneVanillaReagentItem); // parseInt(cloneVanillaReagentItem.quantity / WeNeedToAdd.item_quantity)
                            let t = cloneTranche.reagent_items.indexOf(cloneVanillaReagentItem);
                            if (t !== -1) {
                                cloneTranche.reagent_items.splice(t, 1);
                            }
                            console.log(cloneTranches);
                            for (let vanilla_PricingMethod of WeNeedToAdd) {
                                for (let vanillaTranche of vanilla_PricingMethod.tranches) {
                                    console.log(vanillaTranche);

                                    let tranche_VanillaIndex = cloneTranches.findIndex(tr => tr.asset_class === vanillaTranche.asset_class);
                                    console.log(tranche_VanillaIndex);
                                    if (tranche_VanillaIndex === -1) {
                                        //TODO permutations
                                        cloneTranches.push(vanillaTranche);
                                    } else {
                                        for (let vanillaTranche_reagentItem of vanillaTranche.reagent_items) {
                                            let item_index = cloneTranches[tranche_VanillaIndex].reagent_items.findIndex(rI => rI._id === vanillaTranche_reagentItem._id);
                                            if (item_index === -1) {
                                                cloneTranches[tranche_VanillaIndex].count += 1;
                                                //TODO vanillaTranche_reagentItem.quantity
                                                cloneTranches[tranche_VanillaIndex].reagent_items.push(vanillaTranche_reagentItem);
                                            } else {
                                                cloneTranches[tranche_VanillaIndex].reagent_items[item_index].quantity += vanillaTranche_reagentItem.quantity;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            console.log(cloneTranches)
        }
        console.timeEnd(tested.name);
    } catch (err) {
        console.log(err);
    }
}

tested();