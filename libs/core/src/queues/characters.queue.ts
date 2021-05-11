import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 50,
  removeOnFail: 50,
};

export const charactersQueue: QueueInterface = {
  name: 'OSINT:Characters',
  workerOptions: { concurrency: 40 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
