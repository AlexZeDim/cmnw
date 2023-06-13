import { BattleNetOptions } from 'blizzapi';
import { CharactersEntity, GuildsEntity } from '@app/pg';
import {
  IQCharacter,
  IQCharacterOptions,
  IQGuild,
  IQGuildOptions,
  IQRealm,
} from '@app/core/types';

export type CharacterJobQueue = Readonly<IQCharacter> &
  Omit<CharactersEntity, 'uuid' | 'realmName' | 'realmId'> &
  Readonly<IQCharacterOptions> &
  BattleNetOptions;

export type RealmJobQueue = Readonly<IQRealm> & BattleNetOptions;

export type GuildJobQueue = Readonly<IQGuild> &
  Partial<GuildsEntity> &
  Readonly<IQGuildOptions> &
  BattleNetOptions;
