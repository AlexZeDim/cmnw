import { Queue, Worker, Job, QueueScheduler } from 'bullmq';
import { connectionRedis } from "../db/redis/connectionRedis";
import path from "path";
import pm2 from "pm2";

const queueCore = new Queue('CORE', {connection: connectionRedis});
new QueueScheduler('CORE', {connection: connectionRedis});

console.log(path.join(__dirname, '..', '..', 'dist/core/key.js'));

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
      pm2.connect(err => {
        if (err) console.error(err)
        pm2.start({
          name: 'test',
          script: path.join(__dirname, '..', '..', 'dist/core/keys.js'),
          max_restarts: 1,
          exec_mode: 'fork',
          autorestart: false,
          cron: '*/1 * * * *'
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
