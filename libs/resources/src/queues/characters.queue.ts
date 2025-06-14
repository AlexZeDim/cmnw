import { JobsOptions } from 'bullmq';
import { IQueue } from '../../src/types';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const charactersQueue: IQueue = {
  name: 'OSINT_Characters',
  workerOptions: {
    limiter: {
      max: 75 * 60,
      duration: 60_000,
    },
  },
  defaultJobOptions: options,
};
