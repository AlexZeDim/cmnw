import { JobsOptions } from 'bullmq';
import { IQueue } from 'libs/core/src/types';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const valuationsQueue: IQueue = {
  name: 'DMA:Valuations',
  workerOptions: { concurrency: 15 },
  options: {
    defaultJobOptions: queueOptions,
  },
}
