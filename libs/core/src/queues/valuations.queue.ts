import { JobsOptions } from 'bullmq';
import { IQueue } from 'libs/core/src/types';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const valuationsQueue: IQueue = {
  name: 'DMA:Valuations',
  workerOptions: { concurrency: 15 },
  defaultJobOptions: options,
};
