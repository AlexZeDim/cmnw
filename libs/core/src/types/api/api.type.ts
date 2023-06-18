import {
  ICharacterSummary,
  IMedia,
  IMountsNameWithId,
  IPetType,
} from '@app/core/types';

export type BlizzardApiStringNumber = string | number;

export type BlizzardApiValue = string | number | boolean;

export type BlizzardApiNamedField = Record<string, BlizzardApiValue>;

export type BlizzardApiResponse = Record<
  string,
  BlizzardApiValue | BlizzardApiNamedField
>;

export type BlizzardApiPetsCollection = Record<'pets', Array<IPetType>>;

export type BlizzardApiMountsCollection = Record<'mounts', Array<IMountsNameWithId>>;

export type BlizzardApiCharacterSummary = Readonly<ICharacterSummary>;

export type BlizzardApiCharacterMedia = Readonly<IMedia>;
