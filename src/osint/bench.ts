import '../db/mongo/mongo.connection';
import BlizzAPI from "blizzapi";
import {KeysModel} from '../db/mongo/mongo.model';


(async function f(realm_slug: string = 'gordunni', name_slug: string = 'инициатива'): Promise<void> {
  try {
    const key = await KeysModel.findOne({ tags: 'BlizzardAPI' }).lean();
    if (!key) return;

    const api = new BlizzAPI({
      region: 'eu',
      clientId: key._id,
      clientSecret: key.secret,
      accessToken: key.token
    });
    console.log(key, api)
  } catch (e) {
    console.error(e)
  }
})()
