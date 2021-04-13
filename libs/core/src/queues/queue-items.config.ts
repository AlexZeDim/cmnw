import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const queueItems: QueueInterface = {
  name: 'OSINT:Items',
  options: {
    defaultJobOptions: queueOptions,
  },
};
