import { QueueOptions } from 'bullmq';

export interface QueueInterface {
  readonly name: string,
  readonly options: QueueOptions
}
