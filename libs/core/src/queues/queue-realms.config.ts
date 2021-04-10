import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const queueRealms: QueueInterface = {
  name: 'OSINT:Realms',
  options: {
    defaultJobOptions: queueOptions,
  },
};
