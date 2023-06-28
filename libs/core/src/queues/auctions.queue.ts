import { JobsOptions } from 'bullmq';
import { IQueue } from 'libs/core/src/types';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const auctionsQueue: IQueue = {
  name: 'OSINT:Auctions',
  workerOptions: {
    concurrency: 2,
    lockDuration: 1000 * 60 * 10,
  },
  options: {
    defaultJobOptions: queueOptions,
  },
};
