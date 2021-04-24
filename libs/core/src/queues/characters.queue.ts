import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const charactersQueue: QueueInterface = {
  name: 'OSINT:Characters',
  concurrency: 20,
  options: {
    defaultJobOptions: queueOptions,
  },
};
