import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 50,
  removeOnFail: 50,
};

export const pricingQueue: QueueInterface = {
  name: 'OSINT:Pricing',
  workerOptions: { concurrency: 5 },
  options: {
    defaultJobOptions: queueOptions,
  },
}
