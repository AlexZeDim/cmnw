import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core';

const queueOptions: JobsOptions = {
  removeOnComplete: 50,
  removeOnFail: 50,
};

export const guildsQueue: QueueInterface = {
  name: 'OSINT:Guilds',
  workerOptions: { concurrency: 4 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
