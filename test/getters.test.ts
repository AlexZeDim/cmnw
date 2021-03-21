import {
  getGuild
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
    expect(guild).toHaveProperty('_id', guild_params._id);
    expect(guild).toHaveProperty('name', guild_params.name);
    expect(guild).toHaveProperty('status_code', 200);
    expect(guild).toHaveProperty('realm', guild_params.realm);
    expect(guild).toHaveProperty('created_by');
    expect(guild).toHaveProperty('updated_by');
    expect(guild).toMatchObject({
      members: expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(String),
          id: expect.any(Number),
          rank: expect.any(Number),
        })
      ])
    });
  })
})
