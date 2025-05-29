import { JobsOptions } from 'bullmq';
import { IQueue } from 'libs/core/src/types';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const pricingQueue: IQueue = {
  name: 'DMA:Pricing',
  workerOptions: { concurrency: 3 },
  defaultJobOptions: options,
};
