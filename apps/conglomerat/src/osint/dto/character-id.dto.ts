import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AtSignExists, SWAGGER_CHARACTER_ID } from '@app/core';

export class CharacterIdDto {
  @ApiProperty(SWAGGER_CHARACTER_ID)
  @IsNotEmpty({ message: '_id is required' })
  @IsString()
  @Validate(AtSignExists)
  readonly _id: string;
}
