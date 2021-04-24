import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: true,
};

export const auctionsQueue: QueueInterface = {
  name: 'OSINT:Auctions',
  concurrency: 5,
  options: {
    defaultJobOptions: queueOptions,
  },
};
