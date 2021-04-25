import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 100,
};

export const auctionsQueue: QueueInterface = {
  name: 'OSINT:Auctions',
  workerOptions: { concurrency: 3, lockDuration: 600000 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
