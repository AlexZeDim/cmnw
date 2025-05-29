import { DefaultJobOptions, WorkerOptions } from 'bullmq';
import { LFG_STATUS, OSINT_SOURCE } from '@app/core/constants';

export interface IQueue {
  readonly name: string;
  readonly workerOptions: Pick<WorkerOptions, 'concurrency' | 'lockDuration' | 'limiter'>;
  readonly defaultJobOptions: Pick<DefaultJobOptions, 'removeOnComplete' | 'removeOnFail'>;
}

export interface IQGuildOptions {
  forceUpdate: number;
  createOnlyUnique: boolean;
  iteration?: number;
  requestGuildRank: boolean;
}

export interface IQCharacterOptions {
  forceUpdate: number;
  createOnlyUnique: boolean;
  iteration?: number;
  requestGuildRank: boolean;
  createdBy?: OSINT_SOURCE;
  updatedBy: OSINT_SOURCE;
}

export interface IQCharacterProfile {
  guid: string;
  lookingForGuild?: LFG_STATUS;
  updateRIO?: boolean;
  updateWCL?: boolean;
  updateWP?: boolean;
}

export interface IQGuild {
  guid: string;
  name: string;
  realm: string;
  createdBy?: OSINT_SOURCE;
  updatedBy: OSINT_SOURCE;
}

export interface IQCharacter {
  guid: string;
  name: string;
  realm: string;
  realmId?: number;
  realmName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQRealm {
  id: number;
  slug: string;
  name: string;
  region: 'eu';
}
