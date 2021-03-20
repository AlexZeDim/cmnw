import '../db/mongo/mongo.connection';
import {Job, QueueScheduler, Worker} from "bullmq";
import {redisConnection} from "../db/redis/redis.connection";
import { getAuctions, getItem, getPricing } from "./dma.getter";

/**
 * TODO job option and cron task for W and Q
 */
const schedulerAuctions = new QueueScheduler('DMA:Auctions', {connection: redisConnection});
const schedulerItems = new QueueScheduler('DMA:Items', {connection: redisConnection});
const schedulerPricing = new QueueScheduler('DMA:Pricing', {connection: redisConnection});

(async function (): Promise<void> {
  try {

    const workerAuctions = new Worker('DMA:Auctions', async (job: Job) => await getAuctions(job.data), {
      connection: redisConnection,
      concurrency: 1
    });
    const workerItems = new Worker('DMA:Items', async (job: Job) => await getItem(job.data), {
      connection: redisConnection,
      concurrency: 1
    });
    const workerPricing = new Worker('DMA:Pricing', async (job: Job) => await getPricing(job.data), {
      connection: redisConnection,
      concurrency: 1
    });
    workerAuctions.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
    workerItems.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
    workerPricing.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
  } catch (e) {
    console.error(e)
  }
})()
