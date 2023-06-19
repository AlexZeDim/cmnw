import {
  BlizzardApiCharacterMedia,
  BlizzardApiCharacterSummary,
  BlizzardApiMountsCollection,
  BlizzardApiPetsCollection,
  BlizzardApiResponse,
  IRGuildRoster,
} from '@app/core/types';
import { response } from 'express';

export const isBlizzardApiResponse = (
  response: unknown,
): response is Readonly<BlizzardApiResponse> =>
  typeof response === 'object' && !('error' in response);

export const isGuildRoster = (
  response: unknown,
): response is Readonly<IRGuildRoster> =>
  typeof response === 'object' &&
  'members' in response &&
  Array.isArray(response.members) &&
  Boolean(response.members.length);

export const isPetsCollection = (
  response: unknown,
): response is Readonly<BlizzardApiPetsCollection> =>
  typeof response === 'object' &&
  'pets' in response &&
  Array.isArray(response.pets) &&
  Boolean(response.pets.length);

export const isMountCollection = (
  response: unknown,
): response is Readonly<BlizzardApiMountsCollection> =>
  typeof response === 'object' &&
  'mounts' in response &&
  Array.isArray(response.mounts) &&
  Boolean(response.mounts.length);

export const isCharacterSummary = (
  response: unknown,
): response is Readonly<BlizzardApiCharacterSummary> =>
  typeof response === 'object' &&
  !('error' in response) &&
  'id' in response &&
  'name' in response;

export const isCharacterMedia = (
  response: unknown,
): response is Readonly<BlizzardApiCharacterMedia> =>
  typeof response === 'object' &&
  'assets' in response &&
  Array.isArray(response.assets) &&
  Boolean(response.assets.length);