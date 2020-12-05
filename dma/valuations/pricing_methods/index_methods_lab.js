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

const decks = {
  name: 'DECK',
  methods: [
    {
      reagents: [
        { _id: 173088, quantity: 1 },
        { _id: 173089, quantity: 1 },
        { _id: 173090, quantity: 1 },
        { _id: 173091, quantity: 1 },
        { _id: 173092, quantity: 1 },
        { _id: 173093, quantity: 1 },
        { _id: 173094, quantity: 1 },
        { _id: 173095, quantity: 1 },
      ],
      derivatives: [
        { _id: 173087, quantity: 1 }
      ]
    },
    {
      reagents: [
        { _id: 173070, quantity: 1 },
        { _id: 173071, quantity: 1 },
        { _id: 173072, quantity: 1 },
        { _id: 173073, quantity: 1 },
        { _id: 173074, quantity: 1 },
        { _id: 173075, quantity: 1 },
        { _id: 173076, quantity: 1 },
        { _id: 173077, quantity: 1 },
      ],
      derivatives: [
        { _id: 173069, quantity: 1 }
      ]
    },
    {
      reagents: [
        { _id: 173079, quantity: 1 },
        { _id: 173080, quantity: 1 },
        { _id: 173081, quantity: 1 },
        { _id: 173082, quantity: 1 },
        { _id: 173083, quantity: 1 },
        { _id: 173084, quantity: 1 },
        { _id: 173085, quantity: 1 },
        { _id: 173086, quantity: 1 },
      ],
      derivatives: [
        { _id: 173078, quantity: 1 }
      ]
    },
    {
      reagents: [
        { _id: 173097, quantity: 1 },
        { _id: 173098, quantity: 1 },
        { _id: 173099, quantity: 1 },
        { _id: 173100, quantity: 1 },
        { _id: 173101, quantity: 1 },
        { _id: 173102, quantity: 1 },
        { _id: 173103, quantity: 1 },
        { _id: 173104, quantity: 1 },
      ],
      derivatives: [
        { _id: 173096, quantity: 1 }
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
      precursor.media = 'https://render-eu.worldofwarcraft.com/icons/56/ability_miling.jpg'
      precursor.spell_id = 51005
    }

    if (name === 'ENCH') {
      precursor.media = 'https://render-eu.worldofwarcraft.com/icons/56/inv_enchant_disenchant.jpg'
      precursor.spell_id = 13262
    }

    if (name === 'DECK') precursor.media = 'https://render-eu.worldofwarcraft.com/icons/56/inv_inscription_darkmooncard_generic01.jpg'

    let y = 0;

    for (const method of methods) {
      if (!method.derivatives.length || !method.reagents.length) continue
      y++

      precursor.recipe_id = parseInt(`${precursor.spell_id}${method.reagents[0]._id}`)
      precursor.ticker = `${precursor.mask}:D${precursor.recipe_id}:${y}`
      precursor.reagents = method.reagents
      precursor.derivatives = method.derivatives

      if (name === 'DECK') {
        if (method.derivatives[0]._id === 173087) {
          //Voracity
          precursor.spell_id = 311628
          method.reagents.map(async (card, j) => {
            const blank_card = await pricing_methods_db.findOneAndUpdate({
                ticker: `${precursor.mask}:D${precursor.recipe_id}B${card._id}:${j}:${y}`
              }, {
                ticker: `${precursor.mask}:D${precursor.recipe_id}B${card._id}:${j}:${y}`,
                spell_id: precursor.spell_id,
                profession: `${name}`,
                expansion: 'SHDW',
                type: 'derivative',
                createdBy: 'DMA-LAB',
                updatedBy: 'DMA-LAB',
                reagents: [
                  { _id: 177841, quantity: 1 },
                  { _id: 175970, quantity: 1 },
                ],
                derivatives: [{ _id: card._id, quantity: card.quantity }]
              },
              {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                lean: true,
              }
            )
            console.info(`U,${blank_card.expansion}:${blank_card.ticker},${blank_card._id}`);
          })
        }
        if (method.derivatives[0]._id === 173069) {
          //Putrescence
          precursor.spell_id = 311629
          method.reagents.map(async (card, j) => {
            const blank_card = await pricing_methods_db.findOneAndUpdate({
                ticker: `${precursor.mask}:D${precursor.recipe_id}B${card._id}:${j}:${y}`,
              }, {
                ticker: `${precursor.mask}:D${precursor.recipe_id}B${card._id}:${j}:${y}`,
                spell_id: precursor.spell_id,
                profession: `${name}`,
                expansion: 'SHDW',
                type: 'derivative',
                createdBy: 'DMA-LAB',
                updatedBy: 'DMA-LAB',
                reagents: [
                  { _id: 177843, quantity: 1 },
                  { _id: 175970, quantity: 1 },
                ],
                derivatives: [{ _id: card._id, quantity: card.quantity }]
              },
              {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                lean: true,
              }
            )
            console.info(`U,${blank_card.expansion}:${blank_card.ticker},${blank_card._id}`);
          })
        }
        if (method.derivatives[0]._id === 173078) {
          //Repose
          precursor.spell_id = 311625
          method.reagents.map(async (card, j) => {
            const blank_card = await pricing_methods_db.findOneAndUpdate({
                ticker: `${precursor.mask}:D${precursor.recipe_id}B${card._id}:${j}:${y}`,
              }, {
                ticker: `${precursor.mask}:D${precursor.recipe_id}B${card._id}:${j}:${y}`,
                spell_id: precursor.spell_id,
                profession: `${name}`,
                expansion: 'SHDW',
                type: 'derivative',
                createdBy: 'DMA-LAB',
                updatedBy: 'DMA-LAB',
                reagents: [
                  { _id: 177842, quantity: 1 },
                  { _id: 175970, quantity: 1 },
                ],
                derivatives: [{ _id: card._id, quantity: card.quantity }]
              },
              {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                lean: true,
              }
            )
            console.info(`U,${blank_card.expansion}:${blank_card.ticker},${blank_card._id}`);
          })
        }
        if (method.derivatives[0]._id === 173096) {
          //Indomitable
          precursor.spell_id = 311626
          method.reagents.map(async (card, j) => {
            const blank_card = await pricing_methods_db.findOneAndUpdate({
                ticker: `${precursor.mask}:D${precursor.recipe_id}B${card._id}:${j}:${y}`,
              }, {
                ticker: `${precursor.mask}:D${precursor.recipe_id}B${card._id}:${j}:${y}`,
                spell_id: precursor.spell_id,
                profession: `${name}`,
                expansion: 'SHDW',
                type: 'derivative',
                createdBy: 'DMA-LAB',
                updatedBy: 'DMA-LAB',
                reagents: [
                  { _id: 177840, quantity: 1 },
                  { _id: 175970, quantity: 1 },
                ],
                derivatives: [{ _id: card._id, quantity: card.quantity }]
              },
              {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                lean: true,
              }
            )
            console.info(`U,${blank_card.expansion}:${blank_card.ticker},${blank_card._id}`);
          })
        }

        method.reagents.map(async (card, i) => {
          const card_of_death = await pricing_methods_db.findOneAndUpdate({
              ticker: `${precursor.mask}:D${precursor.recipe_id}T${card._id}:${y}:${i}`
            }, {
              ticker: `${precursor.mask}:D${precursor.recipe_id}T${card._id}:${y}:${i}`,
              spell_id: precursor.spell_id,
              profession: `${name}`,
              expansion: 'SHDW',
              type: 'derivative',
              createdBy: 'DMA-LAB',
              updatedBy: 'DMA-LAB',
              reagents: [{ _id: 173066, quantity: 1 }],
              derivatives: [{ _id: card._id, quantity: card.quantity }]
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              lean: true,
            }
          )
          console.info(`U,${card_of_death.expansion}:${card_of_death.ticker},${card_of_death._id}`);
        })
      }

      const pricing_method = await pricing_methods_db.findOneAndUpdate({
          ticker: precursor.ticker
        },
        precursor,
        {
          upsert: true,
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

MethodsLab(decks)
