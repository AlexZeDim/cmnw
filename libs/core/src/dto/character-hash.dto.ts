import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AtSignExists } from '@app/core';
import { Transform } from 'class-transformer';
import { SWAGGER_CHARACTER_HASH } from '@app/core/swagger/osint.swagger';

export class CharacterHashDto {
  @ApiProperty(SWAGGER_CHARACTER_HASH)
  @IsNotEmpty({ message: 'Hash is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(({ value: hash }) => hash.toLowerCase())
  readonly hash: string;
}
