import { JobsOptions, Queue } from "bullmq";
import { redisConnection } from "../db/redis/redis.connection";

const dmaOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

const queueAuctions = new Queue('DMA:Auctions', {connection: redisConnection});
const queueItems = new Queue('DMA:Items', { connection: redisConnection, defaultJobOptions: dmaOptions });
const queuePricing = new Queue('DMA:Pricing', { connection: redisConnection, defaultJobOptions: dmaOptions });

export {
  queueAuctions,
  queueItems,
  queuePricing
}
