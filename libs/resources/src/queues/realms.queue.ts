import { JobsOptions } from 'bullmq';
import { IQueue } from '../../src/types';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const realmsQueue: IQueue = {
  name: 'OSINT_Realms',
  workerOptions: {
    concurrency: 1
  },
  defaultJobOptions: queueOptions,
};
