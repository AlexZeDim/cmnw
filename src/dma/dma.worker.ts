import '../db/mongo/mongo.connection';
import {Job, QueueScheduler, Worker} from "bullmq";
import {redisConnection} from "../db/redis/redis.connection";
import { getAuctions, getItem } from "./dma.getter";

/**
 * TODO job option and cron task for W and Q
 * TODO add tasks for gold & wowtoken
 */
const schedulerAuctions = new QueueScheduler('DMA:Auctions', {connection: redisConnection});
const schedulerItems = new QueueScheduler('DMA:Items', {connection: redisConnection});

(async function (): Promise<void> {
  try {
    const worker = new Worker('DMA:Auctions', async (job: Job) => await getAuctions(job.data), {
      connection: redisConnection,
      concurrency: 2
    });
    const workerItems = new Worker('DMA:Items', async (job: Job) => await getItem(job.data), {
      connection: redisConnection,
      concurrency: 1
    });
    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
    workerItems.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
  } catch (e) {
    console.error(e)
  }
})()
