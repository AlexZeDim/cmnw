import {
  updateCharacterMedia,
  updateCharacterMounts,
  updateCharacterPets,
  updateCharacterProfessions, updateCharacterRaiderIO,
  updateCharacterSummary,
  updateCharacterWarcraftLogs, updateCharacterWowProgress,
} from "../src/osint/osint.getter";
import {connect, connection, Schema} from 'mongoose';
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
    expect(character_mounts).toMatchSnapshot({
      mounts: expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(Number),
          name: expect.any(String)
        })
      ])
    });
  });

  test('updateCharacterPets', async () => {
    const character_pets = await updateCharacterPets('инициатива', 'gordunni', api);
    expect(character_pets).toMatchSnapshot({
      hash_a: expect.any(String),
      hash_b: expect.any(String),
      pets: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          _id: expect.any(Number),
        })
      ])
    });
  });

  test('updateCharacterProfessions', async () => {
    const character_profession = await updateCharacterProfessions('инициатива', 'gordunni', api);
    expect(character_profession).toMatchSnapshot({
      professions: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          id: expect.any(Number),
          tier: expect.any(String)
        })
      ])
    })
  });

  test('updateCharacterSummary', async () => {
    const character_summary = await updateCharacterSummary('инициатива', 'gordunni', api);
    expect(character_summary).toMatchObject({
      gender: expect.any(String),
      faction: expect.any(String),
      race: expect.any(String),
      character_class: expect.any(String),
      active_spec: expect.any(String),
      realm_id: expect.any(Number),
      realm_name: expect.any(String),
      realm: expect.any(String),
      level: expect.any(Number),
      achievement_points: expect.any(Number),
      last_modified: expect.any(Number),
      average_item_level: expect.any(Number),
      equipped_item_level: expect.any(Number),
      status_code: expect.any(Number),
    })
  });

  test('updateCharacterWarcraftLogs', async () => {
    const wcl_logs = await updateCharacterWarcraftLogs('Саске','gordunni');
    expect(wcl_logs).toMatchObject({
      wcl_percentile: expect.any(Number)
    })
  }, 30000);

  test('updateCharacterRaiderIO', async () => {
    const raider_io = await updateCharacterRaiderIO('Саске','gordunni');
    expect(raider_io).toMatchObject({
      rio_score: expect.any(Number),
      raid_progress: expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(String),
          progress: expect.any(String),
        })
      ])
    })
  });

  test('updateCharacterWowProgress', async () => {
    const wow_progress = await updateCharacterWowProgress('Саске','gordunni');
    expect(wow_progress).toMatchObject({
      battle_tag: expect.any(String),
      transfer: expect.any(Boolean),
      role: expect.any(String),
      languages: expect.arrayContaining([expect.any(String)])
    })
  });
})

