import { JobsOptions } from 'bullmq';
import { IQueue } from '../../src/types';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const auctionsQueue: IQueue = {
  name: 'OSINT_Auctions',
  workerOptions: {
    // concurrency: 5,
    lockDuration: 600_000,
  },
  defaultJobOptions: options,
};
