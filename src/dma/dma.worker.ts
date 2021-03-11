import '../db/mongo/mongo.connection';
import {Job, QueueScheduler, Worker} from "bullmq";
import {redisConnection} from "../db/redis/redis.connection";


const schedulerDma = new QueueScheduler('OSINT:Auctions', {connection: redisConnection});

(async function (): Promise<void> {
  try {
    const worker = new Worker('OSINT:Realms', async (job: Job) => job.data, {
      connection: redisConnection,
      concurrency: 1
    });
    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
  } catch (e) {
    console.error(e)
  }
})()
