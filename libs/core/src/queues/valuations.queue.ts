import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 5000,
  removeOnFail: 5000,
};

export const valuationsQueue: QueueInterface = {
  name: 'OSINT:Valuations',
  workerOptions: { concurrency: 15 },
  options: {
    defaultJobOptions: queueOptions,
  },
}
