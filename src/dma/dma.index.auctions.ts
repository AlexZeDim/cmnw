import '../db/mongo/mongo.connection';
import { RealmModel, KeysModel} from "../db/mongo/mongo.model";
import { queueAuctions } from "./dma.queue";

const indexAuctions = async () => {
  try {
    const key = await KeysModel.findOne({ tags: "BlizzardAPI" });
    if (!key || !key.token) return
    await RealmModel
      .aggregate([
        {
          $group: {
            _id: {
              connected_realm_id: '$connected_realm_id',
              auctions: '$auctions',
            },
            name: { $first: "$name" }
          },
        },
      ])
      .cursor({ batchSize: 5 })
      .exec()
      .eachAsync((realm: any) => {
        queueAuctions.add(realm.name, {
          connected_realm_id: realm._id.connected_realm_id,
          auctions: realm._id.auctions,
          region: 'eu',
          clientId: key._id,
          clientSecret: key.secret,
          accessToken: key.token
        }, { jobId: realm._id.connected_realm_id })
      })
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

indexAuctions()
