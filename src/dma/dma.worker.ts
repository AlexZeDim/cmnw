import '../db/mongo/mongo.connection';
import {Job, QueueScheduler, Worker} from "bullmq";
import {redisConnection} from "../db/redis/redis.connection";
import { getAuctions } from "./dma.getter";


const schedulerDma = new QueueScheduler('DMA:Auctions', {connection: redisConnection});

(async function (): Promise<void> {
  try {
    const worker = new Worker('DMA:Auctions', async (job: Job) => await getAuctions(job.data), {
      connection: redisConnection,
      concurrency: 2
    });
    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
  } catch (e) {
    console.error(e)
  }
})()
