import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const itemsQueue: QueueInterface = {
  name: 'OSINT:Items',
  workerOptions: { concurrency: 5 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
