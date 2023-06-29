import { CharactersEntity, CharactersProfileEntity, GuildsEntity } from '@app/pg';
import { ICharacterRaiderIo } from '@app/core/types';

export type CharacterStatus = {
  id: number;
  isValid: boolean;
  lastModified: Date;
  statusCode: number;
};

export type CharacterExistsOrCreate = {
  characterEntity: CharactersEntity;
  isNew: boolean;
};

export type GuildExistsOrCreate = {
  guildEntity: GuildsEntity;
  isNew: boolean;
};

export type WowProgressProfile = Partial<
  Pick<
    CharactersProfileEntity,
    'battleTag' | 'readyToTransfer' | 'raidDays' | 'playRole' | 'languages'
  >
>;

export type WarcraftLogsProfile = Partial<
  Pick<CharactersProfileEntity, 'heroicLogs' | 'mythicLogs'>
>;

export type RaiderIoCharacterMappingKey = keyof Omit<
  ICharacterRaiderIo,
  | 'achievement_points'
  | 'honorable_kills'
  | 'thumbnail_url'
  | 'region'
  | 'last_crawled_at'
  | 'profile_url'
  | 'profile_banner'
>;

export type RaiderIoCharacterMappingField = keyof Pick<
  CharactersProfileEntity,
  'name' | 'realm' | 'race' | 'class' | 'gender' | 'activeSpec' | 'activeRole'
>;
