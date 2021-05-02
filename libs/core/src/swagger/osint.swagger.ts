import { ApiPropertyOptions } from '@nestjs/swagger';

export const SWAGGER_CHARACTER_ID: ApiPropertyOptions = {
  name: '_id',
  description: 'Character ID in name_slug@realm_slug',
  type: () => String,
  required: true,
  nullable: false,
  example: 'инициатива@gordunni',
};

export const SWAGGER_CHARACTER_HASH: ApiPropertyOptions = {
  name: 'hash',
  description: 'Character hash in hashtype@hash',
  type: () => String,
  required: true,
  nullable: false,
  example: 'a@a99becec48b29ff',
};

export const SWAGGER_GUILD_ID: ApiPropertyOptions = {
  name: '_id',
  description: 'Guild ID in name_slug@realm_slug',
  type: () => String,
  required: true,
  nullable: false,
  example: 'депортация@gordunni',
};

export const SWAGGER_REALM_ID: ApiPropertyOptions = {
  name: '_id',
  description: 'Realm ID for realm server',
  type: () => Number,
  required: false,
  example: 1602,
};

export const SWAGGER_REALM_NAME: ApiPropertyOptions = {
  name: 'name',
  description: 'Realm name or locale name for server',
  type: () => String,
  required: false,
  example: 'Гордунни',
};

export const SWAGGER_REALM_SLUG: ApiPropertyOptions = {
  name: 'slug',
  description: 'Realm slug for server as required by Blizzard, lowercased, without spaces',
  type: () => String,
  required: false,
  example: 'gordunni',
};

export const SWAGGER_REALM_REGION: ApiPropertyOptions = {
  name: 'region',
  description: 'Battle.net region (eu,us, ...kr) in lowercased format',
  type: () => String,
  required: false,
  example: 'eu',
};

export const SWAGGER_REALM_CONNECTED_REALM_ID: ApiPropertyOptions = {
  name: 'connected_realm_id',
  description: 'ID for connected realms cluster',
  type: () => Number,
  required: false,
  example: 1602,
}
