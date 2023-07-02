import { JobsOptions } from 'bullmq';
import { IQueue } from 'libs/core/src/types';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const charactersQueue: IQueue = {
  name: 'OSINT:Characters',
  workerOptions: {
    concurrency: 1,
    lockDuration: 1000 * 60 * 60 * 6,
  },
  options: {
    defaultJobOptions: queueOptions,
  },
};
