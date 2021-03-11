import '../db/mongo/mongo.connection';
import { ItemModel, KeysModel } from "../db/mongo/mongo.model";
import { queueItems } from "./dma.queue";

const indexItems = async (min: number = 1, max: number = 20, updateForce: boolean = true) => {
  try {
    const key = await KeysModel.findOne({ tags: 'BlizzardAPI' });
    if (!key) return

    if (updateForce) {
      for (let i = min; i <= max; i++) {
        await queueItems.add(
          `${i}`,
          {
            _id: i,
            region: 'eu',
            clientId: key._id,
            clientSecret: key.secret,
            accessToken: key.token },
          {
            jobId: `${i}`
          }
        )
      }
    } else {
      await ItemModel
        .find()
        .lean()
        .cursor({ batchSize: 1 })
        .eachAsync(async item => {
          await queueItems.add(
            `${item._id}`,
            {
              _id: item._id,
              region: 'eu',
              clientId: key._id,
              clientSecret: key.secret,
              accessToken: key.token
            },
            {
              jobId: `${item._id}`
            }
          )
        })
    }
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

indexItems(170000, 170100)
