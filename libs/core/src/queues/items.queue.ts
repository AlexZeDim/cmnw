import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const itemsQueue: QueueInterface = {
  name: 'OSINT:Items',
  workerOptions: { concurrency: 3 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
