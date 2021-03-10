import {RealmModel} from "../db/mongo/models/realms.model";
import BlizzAPI, {BattleNetOptions} from 'blizzapi';
import moment from "moment";
import {get} from "mongoose";

const getAuctions = async <T extends { connected_realm_id: number, auctions: number, name: string } & BattleNetOptions> (args: T) => {
  try {
    const if_modified_since = `${moment.unix(args.auctions).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`

    const api = new BlizzAPI({
      region: args.region,
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      accessToken: args.accessToken
    });

    const orders = await api.query(`/data/wow/connected-realm/${args.connected_realm_id}/auctions`, {
      timeout: 30000,
      params: { locale: 'en_GB' },
      headers: {
        'Battlenet-Namespace': 'dynamic-eu',
        'If-Modified-Since': if_modified_since
      }
    })

    console.log(args)

    //insert auctions
    //update ts for realm
  } catch (e) {
    console.error(e)
  }
}

export {
  getAuctions
}
