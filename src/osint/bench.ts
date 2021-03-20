import '../db/mongo/mongo.connection';
import {Job, QueueScheduler, Worker} from 'bullmq';
import {redisConnection} from '../db/redis/redis.connection';

const schedulerOsint = new QueueScheduler('OSINT:Test', {connection: redisConnection});

(async function f(realm_slug: string = 'gordunni', name_slug: string = 'инициатива'): Promise<void> {
  try {
    const worker = new Worker('OSINT:Test', async (job: Job) =>
      console.log(job.data),
      {
      connection: redisConnection,
      concurrency: 1
    });
  } catch (e) {
    console.error(e)
  }
})()
