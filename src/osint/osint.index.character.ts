import '../db/mongo/mongo.connection';
import {CharacterModel, KeysModel} from "../db/mongo/mongo.model";

const indexCharacter = async() => {
  try {
    const key = await KeysModel.find({ tags: 'BlizzardAPI' });
    await CharacterModel
      .find()
      .sort({ 'hash_a': 1 })
      .lean()
      .cursor()
      .eachAsync(async character => {
        //TODO add limiter or something
        const [name, realm] = character._id.split('@');

      })
  } catch (e) {
    console.error(e)
  }
};

indexCharacter().catch();
