import { ApiPropertyOptions } from '@nestjs/swagger';
import { FACTION } from '@app/core/constants';

export const SWAGGER_CHARACTER_ID: ApiPropertyOptions = {
  name: '_id',
  description: 'Character ID in name_slug@realm_slug',
  type: String,
  required: true,
  nullable: false,
  example: 'инициатива@gordunni',
};

export const SWAGGER_CHARACTER_FACTION: ApiPropertyOptions = {
  name: 'faction',
  description: 'Character faction: Horde, Alliance or Neutral',
  type: FACTION,
  enum: FACTION,
  required: false,
  example: FACTION.A
};

export const SWAGGER_CHARACTER_AVGILVL: ApiPropertyOptions = {
  name: 'average_item_level',
  description: 'Character average item level',
  type: Number,
  required: false,
  example: 225,
};

export const SWAGGER_CHARACTER_ILVL: ApiPropertyOptions = {
  name: 'item_level',
  description: 'Character item level (average)',
  type: Number,
  required: false,
  example: 225,
};

export const SWAGGER_CHARACTER_RIO: ApiPropertyOptions = {
  name: 'raider_io',
  description: 'Character Raider IO score',
  type: Number,
  required: false,
  example: 1000,
};

export const SWAGGER_CHARACTER_DAYS_FROM: ApiPropertyOptions = {
  name: 'days_from',
  description: 'Character looking for guild status, raid time days from available',
  type: Number,
  required: false,
  minimum: 1,
  maximum: 7,
  example: 2,
};

export const SWAGGER_CHARACTER_DAYS_TO: ApiPropertyOptions = {
  name: 'days_to',
  description: 'Character looking for guild status, raid time days to available',
  type: Number,
  required: false,
  minimum: 1,
  maximum: 7,
  example: 4,
};

export const SWAGGER_CHARACTER_WCL: ApiPropertyOptions = {
  name: 'wcl_percentile',
  description: 'Character Warcraft Logs actual mythic raid performance percentile',
  type: Number,
  required: false,
  minimum: 0,
  maximum: 100,
  example: 75,
};

export const SWAGGER_CHARACTER_LANGUAGES: ApiPropertyOptions = {
  name: 'languages',
  description: 'WoW Progress candidate file speaking language',
  type: String,
  isArray: true,
  required: false,
  example: ['russian']
};

export const SWAGGER_CHARACTER_REALMS: ApiPropertyOptions = {
  name: 'realms',
  description: 'Realm slugs in array form',
  type: [String],
  isArray: true,
  required: false,
  example: ['gordunni']
};

export const SWAGGER_CHARACTER_HASH: ApiPropertyOptions = {
  name: 'hash',
  description: 'Character hash in hashtype@hash',
  type: String,
  required: true,
  nullable: false,
  example: 'a@a99becec48b29ff',
};

export const SWAGGER_GUILD_ID: ApiPropertyOptions = {
  name: '_id',
  description: 'Guild ID in name_slug@realm_slug',
  type: String,
  required: true,
  nullable: false,
  example: 'депортация@gordunni',
};

export const SWAGGER_REALM_ID: ApiPropertyOptions = {
  name: '_id',
  description: 'Realm ID for realm server',
  type: Number,
  required: false,
  example: 1602,
};

export const SWAGGER_REALM_NAME: ApiPropertyOptions = {
  name: 'name',
  description: 'Realm name or locale name for server',
  type: String,
  required: false,
  example: 'Гордунни',
};

export const SWAGGER_REALM_SLUG: ApiPropertyOptions = {
  name: 'slug',
  description: 'Realm slug for server as required by Blizzard, lowercased, without spaces',
  type: String,
  required: false,
  example: 'gordunni',
};

export const SWAGGER_REALM_REGION: ApiPropertyOptions = {
  name: 'region',
  description: 'Battle.net region (eu, us, ...kr) in lowercased format',
  type: String,
  required: false,
  example: 'eu',
};

export const SWAGGER_REALM_CONNECTED_REALM_ID: ApiPropertyOptions = {
  name: 'connected_realm_id',
  description: 'ID of connected realms',
  type: Number,
  required: false,
  example: 1602,
}

export const SWAGGER_CHARACTER_CLASS: ApiPropertyOptions = {
  name: 'character_class',
  description: 'Unique playable character class',
  required: false,
  type: String,
  example: 'rogue'
}
