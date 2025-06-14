import { JobsOptions } from 'bullmq';
import { IQueue } from '../../src/types';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const charactersQueue: IQueue = {
  name: 'OSINT_Characters',
  workerOptions: {
    concurrency: 20,
    limiter: {
      max: 75,
      duration: 1000,
    },
  },
  defaultJobOptions: options,
};
