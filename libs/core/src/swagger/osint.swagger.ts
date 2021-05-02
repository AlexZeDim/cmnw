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
