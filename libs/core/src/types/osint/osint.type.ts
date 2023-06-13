import { CharactersEntity, GuildsEntity } from '@app/pg';

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
