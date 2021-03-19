
import { connect, connection } from 'mongoose';
//import { getCharacter } from "../src/osint/osint.getter";
import dotenv from 'dotenv'
import path from 'path'
import {KeysModel} from "../src/db/mongo/mongo.model";
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


it('will check the values and pass', async () => {
  const key = await KeysModel.findOne({ tags: 'BlizzardAPI' }).lean();
  expect(key).toMatchSnapshot({
    _id: expect.any(String),
    secret: expect.any(String),
    token: expect.any(String),
    expired_in: expect.any(Number),
  });
  //const character = await getCharacter({ _id: 'инициатива@gordunni', name: 'инициатива', realm: 'gordunni' })
})
