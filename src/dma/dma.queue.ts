import { JobsOptions, Queue } from "bullmq";
import { redisConnection } from "../db/redis/redis.connection";

const dmaOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

const queueAuctions = new Queue('OSINT:Auctions', {connection: redisConnection, defaultJobOptions: dmaOptions});

export {
  queueAuctions
}
