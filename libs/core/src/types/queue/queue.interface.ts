import { QueueOptions, WorkerOptions } from 'bullmq';
import { LFG, OSINT_SOURCE } from '@app/core/constants';

export interface IQueue {
  readonly name: string;
  readonly workerOptions: WorkerOptions;
  readonly options: QueueOptions;
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
  lookingForGuild?: LFG;
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
