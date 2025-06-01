import type { BattleNetOptions } from '@alexzedim/blizzapi';
import { CharactersEntity, GuildsEntity } from '@app/pg';
import {
  IQAuction,
  IQCharacter,
  IQCharacterOptions,
  IQCharacterProfile,
  IQGuild,
  IQGuildOptions,
  IQItem,
  IQRealm,
} from '@app/core/types';

export type CharacterJobQueue = Readonly<IQCharacter> &
  Omit<CharactersEntity, 'uuid' | 'realmName' | 'realmId'> &
  Readonly<IQCharacterOptions> &
  BattleNetOptions;

export type ProfileJobQueue = Pick<CharactersEntity, 'name' | 'realm'> &
  Readonly<IQCharacterProfile>;

export type RealmJobQueue = Readonly<IQRealm> & BattleNetOptions;

export type GuildJobQueue = Readonly<IQGuild> &
  Partial<GuildsEntity> &
  Readonly<IQGuildOptions> &
  BattleNetOptions;

export type AuctionJobQueue = Partial<IQAuction> & BattleNetOptions;

export type ItemJobQueue = Readonly<IQItem> & BattleNetOptions;
