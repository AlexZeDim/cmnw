import '../db/mongo/mongo.connection';
import { KeysModel, RealmModel } from "../db/mongo/mongo.model";
import {getAuctions} from "./dma.getter";

(async function a(): Promise<void> {
  try {
    const realm = await RealmModel.findOne({ name: "Eversong" });
    const key = await KeysModel.findOne({ tags: "BlizzardAPI" });
    if (!realm || !key) return
    await getAuctions({
      name: realm.name,
      connected_realm_id: realm.connected_realm_id,
      auctions: realm.auctions,
      accessToken: key.token,
      region: 'eu',
      clientId: key._id,
      clientSecret: key.secret
    })
  } catch (e) {
    console.error(e)
  }
})()
