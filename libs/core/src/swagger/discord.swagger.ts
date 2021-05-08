import { ApiPropertyOptions } from '@nestjs/swagger';
import { LANG, NOTIFICATIONS } from '@app/core/constants';

export const SWAGGER_DISCORD_SERVER_ID: ApiPropertyOptions = {
  name: 'discord_id',
  description: 'Discord server id',
  type: String,
  required: true,
  nullable: false,
  example: '734001595049705534',
};

export const SWAGGER_DISCORD_SERVER_NAME: ApiPropertyOptions = {
  name: 'discord_name',
  description: 'Discord server name',
  type: String,
  required: true,
  nullable: false,
  example: 'BURROW OF MUFFINS',
};

export const SWAGGER_DISCORD_CHANNEL_ID: ApiPropertyOptions = {
  name: 'channel_id',
  description: 'Discord channel id',
  type: String,
  required: true,
  nullable: false,
  example: '838698784439009300',
};

export const SWAGGER_DISCORD_CHANNEL_NAME: ApiPropertyOptions = {
  name: 'channel_name',
  description: 'Discord channel name',
  type: String,
  required: true,
  nullable: false,
  example: 'initiative',
};

export const SWAGGER_DISCORD_AUTHOR_ID: ApiPropertyOptions = {
  name: 'author_id',
  description: 'Discord author id',
  type: String,
  required: true,
  nullable: false,
  example: '240464611562881024',
};

export const SWAGGER_DISCORD_AUTHOR_NAME: ApiPropertyOptions = {
  name: 'author_name',
  description: 'Discord author nickname',
  type: String,
  required: true,
  nullable: false,
  example: 'AlexZeDim',
};

export const SWAGGER_DISCORD_TYPE: ApiPropertyOptions = {
  name: 'type',
  description: 'Notifications type: recruiting, marker or orders',
  type: NOTIFICATIONS,
  enum: NOTIFICATIONS,
  required: false,
  example: NOTIFICATIONS.ORDERS,
}

export const SWAGGER_DISCORD_LANG: ApiPropertyOptions = {
  name: 'language',
  description: 'Discord bot language',
  type: LANG,
  enum: LANG,
  required: false,
  example: LANG.RU,
}
