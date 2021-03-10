import '../db/mongo/connection';
import {Job, QueueScheduler, Worker} from "bullmq";
import {getRealm} from "./osint.getter";
import {connectionRedis} from "../db/redis/connectionRedis";

const schedulerOsint = new QueueScheduler('OSINT:Realms', {connection: connectionRedis});

/**
 * IIFE for main crawler
 */
(async function () {
  try {
    //TODO add another worker for logs
    const worker = new Worker('OSINT:Realms', async (job: Job) => await getRealm(job.data), {
      connection: connectionRedis,
      concurrency: 2
    });
    /*
    const worker = new Worker('OSINT:Realms', async (job: Job) => await getLog(job.data), {
      connection: connectionRedis,
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
