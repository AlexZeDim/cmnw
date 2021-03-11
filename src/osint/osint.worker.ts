import '../db/mongo/mongo.connection';
import {Job, QueueScheduler, Worker} from "bullmq";
import {getRealm} from "./osint.getter";
import {redisConnection} from "../db/redis/redis.connection";

const schedulerOsint = new QueueScheduler('OSINT:Realms', {connection: redisConnection});

/**
 * IIFE for main crawler
 */
(async function () {
  try {
    //TODO add another worker for logs
    const worker = new Worker('OSINT:Realms', async (job: Job) => await getRealm(job.data), {
      connection: redisConnection,
      concurrency: 2
    });
    /*
    const worker = new Worker('OSINT:Realms', async (job: Job) => await getLog(job.data), {
      connection: redisConnection,
      concurrency: 2
    });
     */
    worker.on('failed', (job) => {
      console.log(`${job}`);
    });
    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
  } catch (e) {
    console.error(e)
  }
})()
