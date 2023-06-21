import { JobsOptions } from 'bullmq';
import { IQueue } from 'libs/core/src/types';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const itemsQueue: IQueue = {
  name: 'DMA:Items',
  workerOptions: { concurrency: 3 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
