import { JobsOptions } from 'bullmq';
import { IQueue } from '@app/core/types';

const options: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const profileQueue: IQueue = {
  name: 'OSINT:Profiles',
  workerOptions: {
    concurrency: 3,
    lockDuration: 1000 * 60 * 60 * 6,
  },
  defaultJobOptions: options,
};
