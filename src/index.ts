import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import { getCharacter } from "./osint/osint.getter"
import { redisConnection } from "./db/redis/redis.connection";

const defaultJobOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

/**
 * IIFE for main crawler
 */
(async function () {
  try {
    const worker = new Worker('Characters', async (job: Job) => await getCharacter(job.data), {
      connection: redisConnection,
      concurrency: 5
    });
    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
  } catch (e) {
    console.error(e)
  }
})()

//TODO options for Queue
export const queueCharacters = new Queue('Characters', {connection: redisConnection, defaultJobOptions});

/*
(async function addJobs(){
  await queue.add('myJobName1', { foo: 'bar' });
  await queue.add('myJobName2', { qux: 'baz' });
  const t = await queue.getWaitingCount()
  console.log(t)
})()
*/

/*const worker = new Worker('OSINT', async job => {
  // Will print { foo: 'bar'} for the first job
  // and { qux: 'baz' } for the second.
  console.log(job.data);
}, { connection });

worker.on('completed', (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});*/
