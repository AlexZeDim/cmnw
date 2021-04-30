import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 1000,
  removeOnFail: 1000,
};

export const pricingQueue: QueueInterface = {
  name: 'OSINT:Pricing',
  workerOptions: { concurrency: 5 },
  options: {
    defaultJobOptions: queueOptions,
  },
}
