import { QueueOptions } from 'bullmq';

export interface QueueInterface {
  readonly name: string,
  readonly concurrency?: number,
  readonly options: QueueOptions
}
