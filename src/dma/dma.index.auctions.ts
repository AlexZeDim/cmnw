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
      .eachAsync(async (realm: any) => {
        await queueAuctions.add(`${realm.name}`, {
          connected_realm_id: realm._id.connected_realm_id,
          region: 'eu',
          clientId: key._id,
          clientSecret: key.secret,
          accessToken: key.token
        }, {
          jobId: `${realm._id.connected_realm_id}`,
          repeat: {
            every: 900000
          }
        })
      })
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

indexAuctions()
