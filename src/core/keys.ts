import '../db/mongo/mongo.connection';
import axios from "axios";
import { KeysModel } from "../db/mongo/mongo.model";

(async (tag: string = 'BlizzardAPI'): Promise<void> => {
  try {
    await KeysModel.find({ tags: tag })
      .cursor()
      .eachAsync(async (key: any) => {
        if (key.secret) {
          const { data } = await axios({
            url: `https://eu.battle.net/oauth/token`,
            method: 'post',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            params: {
              grant_type: 'client_credentials'
            },
            auth: {
              username: key._id,
              password: key.secret
            }
          });
          if (data && 'access_token' in data && 'expires_in' in data) {
            key.token = data.access_token
            key.expired_in = data.expires_in
            await key.save()
            console.info(key)
          }
        }
      })
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
})();


