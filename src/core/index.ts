import { Queue, Worker, Job, QueueScheduler } from 'bullmq';
import { redisConnection } from "../db/redis/redis.connection";
import { launcher } from "./launcher";

const queueCore = new Queue('CORE', {connection: redisConnection});
const schedulerCore = new QueueScheduler('CORE', {connection: redisConnection});

/**
 * IIFE for CORE
 *
 * we need list of the whole JS/TS files here
 * this MAIN process runs a worker, which connects to PM2
 * and manage other processes
 */
(async function () {
  try {
    //TODO add repeatable task
    await queueCore.add('CORE:KEYS', {tag: 'BlizzardAPI'}, {repeat: {cron: '*/1 * * * *'}})
    const worker = new Worker('CORE', async (job: Job) => {
      //TODO start immediate and repeat by cron-task
      console.log(new Date(), job.data)
      //await launcher(job.data)
      return job
    }, {connection: redisConnection});
    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
  } catch (e) {
    console.error(e)
  }
})()
