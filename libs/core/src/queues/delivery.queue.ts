import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const deliveryQueue: QueueInterface = {
  name: 'ORA:Delivery',
  workerOptions: {
    concurrency: 10,
  },
  options: {
    defaultJobOptions: queueOptions,
  },
}
