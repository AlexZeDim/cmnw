import '../db/mongo/mongo.connection';
import {KeysModel, TokenModel} from '../db/mongo/mongo.model';
import BlizzAPI from 'blizzapi';
import {round2} from '../db/mongo/refs';

const indexTokens = async (): Promise<void> => {
  try {
    const key = await KeysModel.findOne({ tags: 'BlizzardAPI' });
    if (!key) return

    const api = new BlizzAPI({
      region: 'eu',
      clientId: key._id,
      clientSecret: key.secret,
      accessToken: key.token
    });

    //TODO it is capable to implement if-modified-since header
    const { last_updated_timestamp, price, lastModified } = await api.query(`/data/wow/token/index`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'dynamic-eu' }
    })

    const wowtoken = await TokenModel.findById(last_updated_timestamp);

    if (!wowtoken) {
      await TokenModel.create({
        _id: last_updated_timestamp,
        region: 'eu',
        price: round2(price / 10000),
        last_modified: lastModified,
      })
    }
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

indexTokens().catch()
