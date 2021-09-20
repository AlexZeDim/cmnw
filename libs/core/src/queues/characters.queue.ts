import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const charactersQueue: QueueInterface = {
  name: 'OSINT:Characters',
  workerOptions: {
    concurrency: 10,
    lockDuration: 1000 * 60 * 60 * 6,
  },
  options: {
    defaultJobOptions: queueOptions,
  },
};
