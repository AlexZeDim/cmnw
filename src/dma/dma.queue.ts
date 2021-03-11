import { JobsOptions, Queue } from "bullmq";
import { redisConnection } from "../db/redis/redis.connection";

const dmaOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
  repeat: {
    cron: '*/5 * * * *'
  }
};

const queueAuctions = new Queue('DMA:Auctions', {connection: redisConnection, defaultJobOptions: dmaOptions});
const queueGolds = new Queue('DMA:Golds', { connection: redisConnection })

export {
  queueAuctions
}
