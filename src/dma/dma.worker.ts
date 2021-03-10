import '../db/mongo/connection';
import {Job, QueueScheduler, Worker} from "bullmq";
import {connectionRedis} from "../db/redis/connectionRedis";


const schedulerDma = new QueueScheduler('OSINT:Auctions', {connection: connectionRedis});

(async function (): Promise<void> {
  try {
    const worker = new Worker('OSINT:Realms', async (job: Job) => job.data, {
      connection: connectionRedis,
      concurrency: 1
    });
    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
  } catch (e) {
    console.error(e)
  }
})()
