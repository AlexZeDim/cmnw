import {
  BlizzardApiAuctions,
  BlizzardApiCharacterMedia,
  BlizzardApiCharacterSummary,
  BlizzardApiItem,
  BlizzardApiItemMedia,
  BlizzardApiMountsCollection,
  BlizzardApiPetsCollection,
  BlizzardApiResponse,
  BlizzardApiWowToken,
  GoldApiListing,
  IRGuildRoster,
} from '@app/core/types';

export const isBlizzardApiResponse = (
  response: unknown,
): response is Readonly<BlizzardApiResponse> =>
  typeof response === 'object' && !('error' in response);

export const isNamedField = (response: unknown) =>
  response && typeof response === 'object' && 'en_GB' in response;

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
): response is BlizzardApiCharacterSummary =>
  typeof response === 'object' &&
  !('error' in response) &&
  'id' in response &&
  'name' in response;

export const isCharacterMedia = (
  response: unknown,
): response is BlizzardApiCharacterMedia =>
  typeof response === 'object' &&
  'assets' in response &&
  Array.isArray(response.assets) &&
  Boolean(response.assets.length);

export const isWowToken = (response: unknown): response is BlizzardApiWowToken =>
  typeof response === 'object' &&
  'price' in response &&
  'lastModified' in response &&
  'last_updated_timestamp' in response;

export const isAuctions = (response: unknown): response is BlizzardApiAuctions =>
  typeof response === 'object' &&
  'lastModified' in response &&
  'auctions' in response &&
  Array.isArray(response.auctions) &&
  Boolean(response.auctions.length);

export const isGold = (response: unknown): response is GoldApiListing =>
  typeof response === 'object' &&
  'price' in response &&
  typeof response.price === 'number' &&
  'quantity' in response &&
  typeof response.quantity === 'number' &&
  'orderId' in response &&
  typeof response.orderId === 'string' &&
  'counterparty' in response &&
  typeof response.counterparty === 'string';

export const isItem = (
  response: PromiseSettledResult<any>,
): response is PromiseFulfilledResult<BlizzardApiItem> =>
  typeof response === 'object' &&
  response.status === 'fulfilled' &&
  'value' in response &&
  Boolean(response.value);

export const isItemMedia = (
  response: PromiseSettledResult<any>,
): response is PromiseFulfilledResult<BlizzardApiItemMedia> =>
  typeof response === 'object' &&
  response.status === 'fulfilled' &&
  'value' in response &&
  'assets' in response.value &&
  Boolean(response.value.assets) &&
  Array.isArray(response.value.assets);
