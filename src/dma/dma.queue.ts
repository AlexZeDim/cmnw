import { JobsOptions, Queue } from "bullmq";
import { redisConnection } from "../db/redis/redis.connection";

const dmaOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

const queueAuctions = new Queue('DMA:Auctions', {connection: redisConnection});
const queueGolds = new Queue('DMA:Golds', { connection: redisConnection });
const queueItems = new Queue('DMA:Items', { connection: redisConnection });
const queueToken = new Queue('DMA:Items', { connection: redisConnection });
const queuePricing = new Queue('DMA:Pricing', { connection: redisConnection });

export {
  queueAuctions,
  queueGolds,
  queueItems,
  queueToken,
  queuePricing
}
