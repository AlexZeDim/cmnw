import { QueueOptions, WorkerOptions } from 'bullmq';

export interface QueueInterface {
  readonly name: string,
  readonly workerOptions: WorkerOptions,
  readonly options: QueueOptions
}
