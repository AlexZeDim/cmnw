import '../db/mongo/connection';
import {Job, QueueScheduler, Worker} from "bullmq";
import {getRealm} from "./getters";
import {connectionRedis} from "../db/redis/connectionRedis";

const schedulerOsint = new QueueScheduler('OSINT:Realms', {connection: connectionRedis});

/**
 * IIFE for main crawler
 */
(async function () {
  try {
    const worker = new Worker('OSINT:Realms', async (job: Job) => await getRealm(job.data), {
      connection: connectionRedis,
      concurrency: 2
    });
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
