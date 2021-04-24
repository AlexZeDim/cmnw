import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const guildsQueue: QueueInterface = {
  name: 'OSINT:Guilds',
  concurrency: 1,
  options: {
    defaultJobOptions: queueOptions,
  },
};
