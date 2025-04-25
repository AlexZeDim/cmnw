import { ApiPropertyOptions } from '@nestjs/swagger';

export const SWAGGER_ACCOUNT_DISCORD_ID: ApiPropertyOptions = {
  name: 'discord_id',
  description: 'Snowflake discord id string',
  type: String,
  required: false,
  example: '240464611562881024',
};

export const SWAGGER_ACCOUNT_BATTLE_TAG: ApiPropertyOptions = {
  name: 'battle_tag',
  description: 'User battle tag from Blizzard',
  type: String,
  required: false,
  example: 'alexzedim#2812',
};

export const SWAGGER_ACCOUNT_NICKNAME: ApiPropertyOptions = {
  name: 'nickname',
  description: 'Short Discord or Battle tag nickname',
  type: String,
  required: false,
  example: 'alexzedim',
};

export const SWAGGER_ACCOUNT_CRYPTONYM: ApiPropertyOptions = {
  name: 'cryptonym',
  description: 'Oraculum file codename',
  type: String,
  required: false,
  example: 'alexzedim',
};
