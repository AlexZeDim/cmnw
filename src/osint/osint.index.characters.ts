import '../db/mongo/mongo.connection';
import {CharacterModel, KeysModel} from "../db/mongo/mongo.model";
import {queueCharacters} from './osint.queue';

const indexCharacter = async() => {
  try {
    const key = await KeysModel.findOne({ tags: 'BlizzardAPI' }).lean();
    if (!key) return;

    await CharacterModel
      .find()
      .sort({ 'hash_a': 1 })
      .lean()
      .cursor()
      .eachAsync(async character => {
        //TODO add limiter or something
        await queueCharacters.add(
          character._id,
          {
            _id: character._id,
            name: character.name,
            realm: character.realm,
            created_by: `OSINT-index`,
            updated_by: `OSINT-index`,
            guildRank: false,
            createOnlyUnique: true,
            region: 'eu',
            clientId: key._id,
            clientSecret: key.secret,
            accessToken: key.token,
          }, {
            jobId: character._id,
            priority: 5
          }
        );
      })
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0);
  }
};

indexCharacter().catch();
