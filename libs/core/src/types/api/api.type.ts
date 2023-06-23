import {
  ICharacterSummary,
  IMedia,
  IMountsNameWithId,
  IPetType,
  IWowToken,
} from '@app/core/types';

export type BlizzardApiStringNumber = string | number;

export type BlizzardApiValue = string | number | boolean;

export type BlizzardApiNamedField = Record<string, BlizzardApiValue>;

export type BlizzardApiArray = Array<BlizzardApiValue | BlizzardApiNamedField>;

export type BlizzardApiResponse = Record<
  string,
  BlizzardApiValue | BlizzardApiNamedField | BlizzardApiArray
>;

export type BlizzardApiArrayResponse = Record<string, BlizzardApiArray>;

export type BlizzardApiPetsCollection = Record<'pets', Array<IPetType>>;

export type BlizzardApiMountsCollection = Record<'mounts', Array<IMountsNameWithId>>;

export type BlizzardApiCharacterSummary = Readonly<ICharacterSummary>;

export type BlizzardApiCharacterMedia = Readonly<IMedia>;

export type BlizzardApiWowToken = Readonly<IWowToken>;
