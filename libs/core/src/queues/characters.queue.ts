import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 1000,
  removeOnFail: 1000,
};

export const charactersQueue: QueueInterface = {
  name: 'OSINT:Characters',
  workerOptions: { concurrency: 25 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
