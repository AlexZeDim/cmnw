import { JobsOptions } from 'bullmq';

export interface QueueInterface {
  readonly name: string,
  readonly options: JobsOptions
}
