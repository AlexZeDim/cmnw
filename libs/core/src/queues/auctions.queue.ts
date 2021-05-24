import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const auctionsQueue: QueueInterface = {
  name: 'OSINT:Auctions',
  workerOptions: {
    concurrency: 1,
    lockDuration: 1000 * 60 * 5,
    limiter: {
      max: 3,
      duration: 1000 * 15,
    }
  },
  options: {
    defaultJobOptions: queueOptions,
  },
};
