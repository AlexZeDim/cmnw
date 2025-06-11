import { JobsOptions } from 'bullmq';
import { IQueue } from '@app/core';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const guildsQueue: IQueue = {
  name: 'OSINT_Guilds',
  workerOptions: {
  /*
    concurrency: 10,
    limiter: {
      max: 5,
      duration: 1000,
    },
  */
  },
  defaultJobOptions: options,
};
