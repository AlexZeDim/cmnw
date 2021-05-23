import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const auctionsQueue: QueueInterface = {
  name: 'OSINT:Auctions',
  workerOptions: { concurrency: 5, lockDuration: 1200000 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
