import {
  IAuctions,
  ICharacterSummary,
  IGold,
  ICharacterMedia,
  IMountsNameWithId,
  IPetType,
  IWowToken,
  IItem,
  IItemMedia,
  IHallOfFame,
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

export type BlizzardApiCharacterMedia = Readonly<ICharacterMedia>;

export type BlizzardApiWowToken = Readonly<IWowToken>;

export type BlizzardApiAuctions = Readonly<IAuctions>;

export type BlizzardApiHallOfFame = Readonly<IHallOfFame>;

export type GoldApiListing = Readonly<IGold>;

export type BlizzardApiItem = Partial<IItem>;

export type BlizzardApiItemMedia = IItemMedia;

export type BlizzardApiKeys = {
  access_token: string;
  token_type: string;
  expires_in: number;
  sub: string;
};

export type BlizzardApiErrorResponse = {
  status: number;
  response: {
    status: number;
    statusText: string;
  }
};
