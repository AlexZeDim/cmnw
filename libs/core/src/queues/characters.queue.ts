import { JobsOptions } from 'bullmq';
import { IQueue } from 'libs/core/src/types';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const charactersQueue: IQueue = {
  name: 'OSINT_Characters',
  workerOptions: {
    concurrency: 1,
    lockDuration: 1000 * 60 * 60 * 6,
  },
  defaultJobOptions: options,
};
