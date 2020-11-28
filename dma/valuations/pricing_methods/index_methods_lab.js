require('../../../db/connection')
const pricing_methods_db = require('../../../db/models/pricing_methods_db');

const milling = {
  name: 'INSC',
  methods: [
    {
      item: 168589,
      quantity: 20,
      derivative: [
        { id: 173056, quantity: 3.7 },
        { id: 173057, quantity: 1.96 },
        { id: 175788, quantity: 0.1 },
      ]
    },
    {
      item: 168583,
      quantity: 20,
      derivative: [
        { id: 173056, quantity: 3.7 },
        { id: 173057, quantity: 1.96 },
        { id: 175788, quantity: 0.1 },
      ]
    },
    {
      item: 170554,
      quantity: 20,
      derivative: [
        { id: 173056, quantity: 1.96 },
        { id: 173057, quantity: 3.7 },
        { id: 175788, quantity: 0.1 },
      ]
    },
    {
      item: 168586,
      quantity: 20,
      derivative: [
        { id: 173056, quantity: 1.96 },
        { id: 173057, quantity: 3.7 },
        { id: 175788, quantity: 0.1 },
      ]
    },
    {
      item: 169701,
      quantity: 20,
      derivative: [
        { id: 173056, quantity: 2.9 },
        { id: 173057, quantity: 2.9 },
        { id: 175788, quantity: 0.1 },
      ]
    },
    {
      item: 171315,
      quantity: 20,
      derivative: [
        { id: 173056, quantity: 5 },
        { id: 173057, quantity: 5 },
        { id: 175788, quantity: 6.1 },
      ]
    },
  ]
}

const disenchant = {
  name: 'ENCH',
  methods: [
    {
      item: 173201,
      quantity: 1,
      derivative: [
        { id: 172230, quantity: 2.85 }
      ]
    },
    {
      item: 172241,
      quantity: 1,
      derivative: [
        { id: 172230, quantity: 2.85 }
      ]
    },
    {
      item: 172257,
      quantity: 1,
      derivative: [
        { id: 172230, quantity: 2.85 }
      ]
    },
    {
      item: 171381,
      quantity: 1,
      derivative: [
        { id: 172230, quantity: 2.85 }
      ]
    },
    {
      item: 173222,
      quantity: 1,
      derivative: [
        { id: 172230, quantity: 1.43 },
        { id: 172231, quantity: 2.85 }
      ]
    },
    {
      item: 172257,
      quantity: 1,
      derivative: [
        { id: 172230, quantity: 1.43 },
        { id: 172231, quantity: 2.85 }
      ]
    },
    {
      item: 172265,
      quantity: 1,
      derivative: [
        { id: 172230, quantity: 1.43 },
        { id: 172231, quantity: 2.85 }
      ]
    },
    {
      item: 171449,
      quantity: 1,
      derivative: [
        { id: 172230, quantity: 1.43 },
        { id: 172231, quantity: 2.85 }
      ]
    },
  ]
}

async function T ({ name, methods }) {
  try {
    if (!methods.length) return

    const precursor = {
      mask: `${name}`,
      spell_id: 51005,
      profession: `${name}`,
      expansion: 'SHDW',
      type: 'derivative',
      createdBy: 'DMA-LAB',
      updatedBy: 'DMA-LAB',
    };


    if (name === 'INSC') {
      precursor.mask = `${precursor.mask}#51005`
      precursor.media = 'https://render-eu.worldofwarcraft.com/icons/56/ability_miling.jpg'
      precursor.spell_id = 51005
    }

    if (name === 'ENC') {
      precursor.mask = `${precursor.mask}#13262`
      precursor.media = 'https://render-eu.worldofwarcraft.com/icons/56/inv_enchant_disenchant.jpg'
      precursor.spell_id = 13262
    }

    for (const method of methods) {
      if (!method.derivative.length || !method.item) continue
      method.derivative.map(async derivative_ => {
        precursor.ticker = `${precursor.mask}:D${derivative_.id}`
        precursor.item_id = derivative_.id;
        precursor.recipe_id = parseInt(`${derivative_.id}${method.item}`)
        precursor.item_quantity = derivative_.quantity;
        precursor.reagents = [
          {_id: method.item, quantity: method.quantity }
        ]
        console.log(precursor)
        const pricing_method = await pricing_methods_db.findOneAndUpdate(
          { item_id: precursor.item_id, recipe_id: precursor.recipe_id },
          precursor,
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            lean: true,
          }
        )
        console.info(`U,${pricing_method.expansion}:${pricing_method.profession}:${pricing_method.item_id},${pricing_method._id}`);
        precursor.ticker = name
      })
    }
  } catch (e) {
    console.error(e)
  }
}

T(disenchant)

