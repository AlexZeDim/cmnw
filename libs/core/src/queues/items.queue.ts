import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 50,
  removeOnFail: 50,
};

export const itemsQueue: QueueInterface = {
  name: 'OSINT:Items',
  workerOptions: { concurrency: 10 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
