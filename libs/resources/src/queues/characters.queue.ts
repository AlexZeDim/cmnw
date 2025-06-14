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
  },
  defaultJobOptions: options,
};
