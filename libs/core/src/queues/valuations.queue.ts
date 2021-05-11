import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: 50,
  removeOnFail: 50,
};

export const valuationsQueue: QueueInterface = {
  name: 'OSINT:Valuations',
  workerOptions: { concurrency: 15 },
  options: {
    defaultJobOptions: queueOptions,
  },
}
