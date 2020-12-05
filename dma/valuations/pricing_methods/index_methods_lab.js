require('../../../db/connection')
const pricing_methods_db = require('../../../db/models/pricing_methods_db');

const milling = {
  name: 'INSC',
  methods: [
    {
      reagents: [
        { _id: 168589, quantity: 20 }
      ],
      derivatives: [
        { _id: 173056, quantity: 3.7 },
        { _id: 173057, quantity: 1.96 },
        { _id: 175788, quantity: 0.1 },
      ]
    },
    {
      reagents: [
        { _id: 168583, quantity: 20 }
      ],
      derivatives: [
        { _id: 173056, quantity: 3.7 },
        { _id: 173057, quantity: 1.96 },
        { _id: 175788, quantity: 0.1 },
      ]
    },
    {
      reagents: [
        { _id: 170554, quantity: 20 }
      ],
      derivatives: [
        { _id: 173056, quantity: 1.96 },
        { _id: 173057, quantity: 3.7 },
        { _id: 175788, quantity: 0.1 },
      ]
    },
    {
      reagents: [
        { _id: 168586, quantity: 20 }
      ],
      derivatives: [
        { _id: 173056, quantity: 1.96 },
        { _id: 173057, quantity: 3.7 },
        { _id: 175788, quantity: 0.1 },
      ]
    },
    {
      reagents: [
        { _id: 169701, quantity: 20 }
      ],
      derivatives: [
        { _id: 173056, quantity: 2.9 },
        { _id: 173057, quantity: 2.9 },
        { _id: 175788, quantity: 0.1 },
      ]
    },
    {
      reagents: [
        { _id: 171315, quantity: 20 }
      ],
      derivatives: [
        { _id: 173056, quantity: 5 },
        { _id: 173057, quantity: 5 },
        { _id: 175788, quantity: 6.1 },
      ]
    },
  ]
}

const disenchant = {
  name: 'ENCH',
  methods: [
    {
      reagents: [
        { _id: 173201, quantity: 1 }
      ],
      derivatives: [
        { _id: 172230, quantity: 2.04 }
      ]
    },
    {
      reagents: [
        { _id: 172241, quantity: 1 }
      ],
      derivatives: [
        { _id: 172230, quantity: 2.04 }
      ]
    },
    {
      reagents: [
        { _id: 172257, quantity: 1 }
      ],
      derivatives: [
        { _id: 172230, quantity: 2.04 }
      ]
    },
    {
      reagents: [
        { _id: 171381, quantity: 1 }
      ],
      derivatives: [
        { _id: 172230, quantity: 2.04 }
      ]
    },
    {
      reagents: [
        { _id: 173222, quantity: 1 }
      ],
      derivatives: [
        { _id: 172230, quantity: 1.35 },
        { _id: 172231, quantity: 1.44 }
      ]
    },
    {
      reagents: [
        { _id: 172257, quantity: 1 }
      ],
      derivatives: [
        { _id: 172230, quantity: 1.35 },
        { _id: 172231, quantity: 1.44 }
      ]
    },
    {
      reagents: [
        { _id: 172265, quantity: 1 }
      ],
      derivatives: [
        { _id: 172230, quantity: 1.35 },
        { _id: 172231, quantity: 1.44 }
      ]
    },
    {
      reagents: [
        { _id: 171449, quantity: 1 }
      ],
      derivatives: [
        { _id: 172230, quantity: 1.43 },
        { _id: 172231, quantity: 1.44 }
      ]
    },
  ]
}

async function MethodsLab ({ name, methods }) {
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

    let y = 0;

    for (const method of methods) {
      if (!method.derivatives.length || !method.reagents.length) continue
      y++
      precursor.recipe_id = parseInt(`${precursor.spell_id}${method.reagents[0]._id}`)
      precursor.ticker = `${precursor.mask}:D${precursor.recipe_id}:${y}`
      precursor.reagents = method.reagents
      precursor.derivatives = method.derivatives
      const pricing_method = await pricing_methods_db.findOneAndUpdate(
        { item_id: precursor.item_id, recipe_id: precursor.recipe_id },
        precursor,
        {
          upsert: true,
          strict: false,
          new: true,
          setDefaultsOnInsert: true,
          lean: true,
        }
      )
      console.info(`U,${pricing_method.expansion}:${pricing_method.ticker},${pricing_method._id}`);
      precursor.ticker = precursor.mask
    }
  } catch (e) {
    console.error(e)
  }
}

MethodsLab(disenchant)

MethodsLab(milling)

