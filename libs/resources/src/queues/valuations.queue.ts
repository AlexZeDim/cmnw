import { JobsOptions } from 'bullmq';
import { IQueue } from '../../src/types';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const valuationsQueue: IQueue = {
  name: 'DMA_Valuations',
  workerOptions: {
    // concurrency: 15
  },
  defaultJobOptions: options,
};
