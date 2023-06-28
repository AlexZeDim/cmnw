import { JobsOptions } from 'bullmq';
import { IQueue } from '@app/core';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const guildsQueue: IQueue = {
  name: 'OSINT:Guilds',
  workerOptions: {
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 1000,
    },
  },
  options: {
    defaultJobOptions: queueOptions,
  },
};
