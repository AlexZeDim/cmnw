import { JobsOptions } from 'bullmq';
import { IQueue } from 'libs/core/src/types';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const realmsQueue: IQueue = {
  name: 'OSINT:Realms',
  workerOptions: { concurrency: 1 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
