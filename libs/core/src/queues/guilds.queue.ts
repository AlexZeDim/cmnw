import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const guildsQueue: QueueInterface = {
  name: 'OSINT:Guilds',
  workerOptions: {
    concurrency: 5,
    limiter: {
      max: 5,
      duration: 1000,
    }
  },
  options: {
    defaultJobOptions: queueOptions,
  },
};
