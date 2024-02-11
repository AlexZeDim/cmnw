import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AtSignExists, SWAGGER_CHARACTER_GUID } from '@app/core';
import { Transform } from 'class-transformer';

export class CharacterIdDto {
  @ApiProperty(SWAGGER_CHARACTER_GUID)
  @IsNotEmpty({ message: 'guid is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(({ value: guid }) => guid.toLowerCase())
  readonly guid: string;
}
