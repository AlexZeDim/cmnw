import { Queue, Worker, Job } from 'bullmq';
import { connectionRedis } from "../db/redis/connectionRedis";
import pm2 from "pm2";

/**
 * TODO retry on writes & cron-task
 * TODO queue management system here, with cleans and deletes
 */

const queueCore = new Queue('CORE', {connection: connectionRedis});

/**
 * IIFE for CORE
 */
(async function () {
  try {
    //TODO add repeatable task
    await queueCore.add('CORE:KEYS', {tag: 'BlizzardAPI'}, {repeat: {cron: '*/1 * * * *'}})
    const worker = new Worker('CORE', async (job: Job) => {
      //TODO start immediate and repeat by cron-task
      console.log(job.data)
      await pm2.connect(err => {
        if (err) console.error(err)
        pm2.start({
          name: '',
          script: '',
          exec_mode: 'cluster',
          max_memory_restart: '100M',
        }, (err) => {
          if (err) console.error(err)
          pm2.disconnect()
        });
      });
      return job
    }, {connection: connectionRedis});
    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });
  } catch (e) {
    console.error(e)
  }
})()
