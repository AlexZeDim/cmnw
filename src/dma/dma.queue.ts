import { JobsOptions, Queue } from "bullmq";
import { connectionRedis } from "../db/redis/connectionRedis";

const dmaOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

const queueAuctions = new Queue('OSINT:Auctions', {connection: connectionRedis, defaultJobOptions: dmaOptions});
