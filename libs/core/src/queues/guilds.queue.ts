import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core';

const queueOptions: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 100,
};

export const guildsQueue: QueueInterface = {
  name: 'OSINT:Guilds',
  concurrency: 5,
  options: {
    defaultJobOptions: queueOptions,
  },
};
