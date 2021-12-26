import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core';

const queueOptions: JobsOptions = {
  removeOnComplete: 10,
  removeOnFail: 10,
};

export const messagesQueue: QueueInterface = {
  name: 'ORA:Messages',
  workerOptions: {
    concurrency: 10,
  },
  options: {
    defaultJobOptions: queueOptions,
  },
}
