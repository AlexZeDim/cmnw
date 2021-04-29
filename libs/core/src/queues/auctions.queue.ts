import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 100,
};

export const auctionsQueue: QueueInterface = {
  name: 'OSINT:Auctions',
  workerOptions: { concurrency: 4, lockDuration: 1200000 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
