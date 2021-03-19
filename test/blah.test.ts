import {
  updateCharacterMedia,
  updateCharacterMounts,
  updateCharacterPets,
  updateCharacterProfessions
} from "../src/osint/osint.getter";
import { connect, connection } from 'mongoose';
import {KeysModel} from "../src/db/mongo/mongo.model";
import BlizzAPI from 'blizzapi';
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '..', '.env') })

beforeAll(async () => {
  await connect(
    `${process.env.MONGO}`,
    {
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
      bufferMaxEntries: 0,
      useCreateIndex: true,
      w: 'majority',
      socketTimeoutMS: 8.64e+7,
      family: 4,
    },
  );
});

afterAll(async () => {
  await connection.close();
});


describe('core', () => {
  test('key', async () => {
    const key = await KeysModel.findOne({ tags: 'BlizzardAPI' }).lean();
    expect(key).toMatchSnapshot({
      _id: expect.any(String),
      secret: expect.any(String),
      token: expect.any(String),
      expired_in: expect.any(Number),
    });
  });
})

describe('updaters', () => {
  let key, api: BlizzAPI;
  beforeAll(async () => {
    key = await KeysModel.findOne({ tags: 'BlizzardAPI' }).lean();
    if (!key) return
    api = new BlizzAPI({
      region: 'eu',
      clientId: key._id,
      clientSecret: key.secret,
      accessToken: key.token
    });
  });

  test('updateCharacterMedia', async () => {
    const character_media = await updateCharacterMedia('инициатива', 'gordunni', api);
    expect(character_media).toMatchSnapshot({
      id: expect.any(Number),
      avatar: expect.any(String),
      inset: expect.any(String),
      main: expect.any(String),
    });
  });

  test('updateCharacterMounts', async () => {
    const character_mounts = await updateCharacterMounts('инициатива', 'gordunni', api);
    expect(character_mounts.mounts[0]).toMatchSnapshot({ _id: expect.any(Number), name: expect.any(String) });
  });

  test('updateCharacterPets', async () => {
    const character_pets = await updateCharacterPets('инициатива', 'gordunni', api);
    expect(character_pets).toMatchSnapshot({
      hash_a: expect.any(String),
      hash_b: expect.any(String),
      pets: expect.any(Array)
    });
  });

  test('updateCharacterProfessions', async () => {
    const character_profession = await updateCharacterProfessions('инициатива', 'gordunni', api);
    expect(character_profession.professions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          id: expect.any(Number),
          tier: expect.any(String)
        })
      ])
    );
  });
})

