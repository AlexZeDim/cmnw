import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const valuationsQueue: QueueInterface = {
  name: 'DMA:Valuations',
  workerOptions: { concurrency: 15 },
  options: {
    defaultJobOptions: queueOptions,
  },
}
