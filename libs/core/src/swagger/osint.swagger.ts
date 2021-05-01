import { ApiPropertyOptions } from '@nestjs/swagger';

export const SWAGGER_CHARACTER_ID: ApiPropertyOptions = {
  name: '_id',
  description: 'Character ID in name_slug@realm_slug',
  type: () => String,
  required: true,
  nullable: false,
  example: 'инициатива@gordunni',
};
