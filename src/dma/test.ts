import '../db/mongo/mongo.connection';
//import {KeysModel, PricingModel, RealmModel} from "../db/mongo/mongo.model";
//import { getGold } from "./dma.getter";

(async function a(): Promise<void> {
  try {
    //await getGold()
    /*const realm = await RealmModel.findOne({ name: "Eversong" });
    const key = await KeysModel.findOne({ tags: "BlizzardAPI" });
    if (!realm || !key) return
    console.log(realm)
    await getAuctions({
      name: realm.name,
      connected_realm_id: realm.connected_realm_id,
      auctions: realm.auctions,
      accessToken: key.token,
      region: 'eu',
      clientId: key._id,
      clientSecret: key.secret
    })*/
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
})()
