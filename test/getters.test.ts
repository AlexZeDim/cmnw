import {
  getGuild,
  getCharacter,
} from "../src/osint/osint.getter";
import {connect, connection} from 'mongoose';
import {KeysModel} from "../src/db/mongo/mongo.model";
import dotenv from 'dotenv';
import path from 'path';
import { DocumentType } from "@typegoose/typegoose";
import { Key } from "../src/db/mongo/schemas/keys.schema";

dotenv.config({path: path.join(__dirname, '..', '.env')});

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

describe('getters', () => {
  let key: Pick<DocumentType<Key>, "_id" | "secret" | "token" | "expired_in" | "tags" | "typegooseName"> | null = null;

  beforeAll(async () => {
    key = await KeysModel.findOne({tags: 'BlizzardAPI'}).lean();
  });

  test('getGuild', async () => {
    if (!key) return

    const guild_params = {
      _id: 'депортация@gordunni',
      name: 'Депортация',
      realm: 'gordunni',
      updated_by: 'jest',
      forceUpdate: true,
      members: [],
      region: 'eu',
      clientId: key._id,
      clientSecret: key.secret,
      accessToken: key.token
    }

    const guild = await getGuild(guild_params);
    expect(guild).toMatchObject({
      _id: guild_params._id,
      name: guild_params.name,
      status_code: 200,
      realm: guild_params.realm,
      created_by: expect.any(String),
      updated_by: expect.any(String),
      members: expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(String),
          id: expect.any(Number),
          rank: expect.any(Number),
        })
      ])
    });
  })

  test('getCharacter: инициатива@gordunni', async () => {
    if (!key) return

    const character_params = {
      _id: 'инициатива@gordunni',
      name: 'Инициатива',
      realm: 'gordunni',
      realm_id: 1602,
      realm_name: 'Gordunni',
      character_class: 'Rogue',
      updated_by: 'Jest',
      status_code: 200,
      forceUpdate: true,
      createOnlyUnique: false,
      region: 'eu',
      clientId: key._id,
      clientSecret: key.secret,
      accessToken: key.token
    }

    const character = await getCharacter(character_params);
    expect(character).toMatchObject({
      _id: character_params._id,
      name: character_params.name,
      realm: character_params.realm,
      realm_id: character_params.realm_id,
      realm_name: character_params.realm_name,
      status_code: character_params.status_code,
      updated_by: character_params.updated_by,
      mounts: expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(Number),
          name: expect.any(String)
        })
      ]),
      pets: expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(Number),
          name: expect.any(String)
        })
      ]),
      professions: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          tier: expect.any(String)
        })
      ]),
      id: expect.any(Number),
      gender: expect.any(String),
      faction: expect.any(String),
      race: expect.any(String),
      character_class: character_params.character_class,
      active_spec:  expect.any(String),
      level: expect.any(Number),
      achievement_points: expect.any(Number),
      average_item_level: expect.any(Number),
      equipped_item_level: expect.any(Number),
      hash_a: expect.any(String),
      hash_b: expect.any(String),
      avatar: expect.any(String),
      inset: expect.any(String),
      main: expect.any(String),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    })
  })

  test('getCharacter: саске@gordunni', async () => {
    if (!key) return

    const character_params = {
      _id: 'саске@gordunni',
      name: 'Саске',
      realm: 'gordunni',
      realm_id: 1602,
      realm_name: 'Gordunni',
      character_class: 'Mage',
      updated_by: 'Jest',
      status_code: 200,
      forceUpdate: true,
      createOnlyUnique: false,
      updateRIO: true,
      updateWCL: true,
      updateWP: true,
      region: 'eu',
      clientId: key._id,
      clientSecret: key.secret,
      accessToken: key.token
    }

    const character = await getCharacter(character_params);
    expect(character).toMatchObject({
      _id: character_params._id,
      name: character_params.name,
      realm: character_params.realm,
      realm_id: character_params.realm_id,
      realm_name: character_params.realm_name,
      status_code: character_params.status_code,
      updated_by: character_params.updated_by,
      mounts: expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(Number),
          name: expect.any(String)
        })
      ]),
      pets: expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(Number),
          name: expect.any(String)
        })
      ]),
      professions: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          tier: expect.any(String)
        })
      ]),
      id: expect.any(Number),
      gender: expect.any(String),
      faction: expect.any(String),
      race: expect.any(String),
      character_class: character_params.character_class,
      active_spec:  expect.any(String),
      level: expect.any(Number),
      achievement_points: expect.any(Number),
      average_item_level: expect.any(Number),
      equipped_item_level: expect.any(Number),
      hash_a: expect.any(String),
      avatar: expect.any(String),
      inset: expect.any(String),
      main: expect.any(String),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      battle_tag: expect.any(String),
      rio_score: expect.any(Number),
      wcl_percentile: expect.any(Number),
      role: expect.any(String),
      transfer: expect.any(Boolean),
      raid_progress: expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(String),
          progress: expect.any(String),
        })
      ]),
    })
  }, 30000)
})
