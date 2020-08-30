/**
 * Connection with DB
 */

const { connect, connection } = require('mongoose');
require('dotenv').config();
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: 'majority',
    family: 4,
  },
);

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () =>
  console.log('Connected to database on ' + process.env.hostname),
);

/**
 * Model importing
 */

const keys_db = require('../../db/keys_db');
const pets_db = require('../../db/pets_db');

/**
 *  Modules
 */

const battleNetWrapper = require('battlenet-api-wrapper');
const csv = require('csv');
const fs = require('fs');
const { normalize } = require('path');

async function indexPets (queryKeys = 'DMA', path = 'C:\\Projects\\conglomerat\\uploads\\creaturexdisplayinfo.csv') {
  try {
    console.time(`DMA-${indexPets.name}`)

    const { _id, secret, token } = await keys_db.findOne({ tags: queryKeys });

    const bnw = new battleNetWrapper();
    await bnw.init (_id, secret, token, 'eu', 'en_GB');

    let { pets } = await bnw.WowGameData.getPetsIndex()
    if (pets && pets.length) {
      for (let { id } of pets) {
        let petData = await bnw.WowGameData.getPet(id);
        if (petData) {
          let pet = await pets_db.findById(id)
          if (!pet) {
            pet = new pets_db({
              _id: id
            })
          }
          pet.name = petData.name;
          pet.description = petData.description;
          if (petData.battle_pet_type && petData.battle_pet_type.name) {
            pet.battle_pet_type = petData.battle_pet_type.name
          }
          if (petData.abilities && petData.abilities.length) {
            pet.abilities = petData.abilities;
          }
          let fields = ['is_capturable', 'is_tradable', 'is_battlepet', 'is_alliance_only', 'is_horde_only', 'is_random_creature_display'];
          for (let field of fields) {
            pet.properties[field] = petData[field]
          }
          if (petData.source && petData.source.name) {
            pet.source = petData.source.name
          }
          pet.icon = petData.icon
          if (petData.creature && petData.creature.id) {
            pet.creature_id = petData.creature.id
          }
          if (petData.media && petData.media.id) {
            pet.media_id = petData.media.id
          }
          await pet.save();
          console.info(`${pet._id}, ${pet.name}`)
        }
      }
    }
    let path_;
    if (process.env.PWD) {
      path_ = normalize(`${process.env.PWD}/uploads/creaturexdisplayinfo.csv`);
    } else {
      path_ = path;
    }
    let fileSync = fs.readFileSync(path_, 'utf8');
    await csv.parse(fileSync, async function (err, data) {
      for (let i = 1; i < data.length; i++) {
        let pet = await pets_db.findOne({creature_id: parseInt(data[i][5])})
        if (pet) {
          pet.display_id = parseInt(data[i][1])
          await pet.save();
          console.info(`${pet._id}, ${pet.creature_id}, ${pet.display_id}`)
        }
      }
    });
    await connection.close();
    console.timeEnd(`DMA-${indexPets.name}`)
  } catch (error) {
    console.error(error)
  }
}


indexPets();
