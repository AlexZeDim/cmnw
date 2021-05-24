import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const charactersQueue: QueueInterface = {
  name: 'OSINT:Characters',
  workerOptions: {
    concurrency: 15,
    limiter: {
      max: 100,
      duration: 1000,
    }
  },
  options: {
    defaultJobOptions: queueOptions,
  },
};
