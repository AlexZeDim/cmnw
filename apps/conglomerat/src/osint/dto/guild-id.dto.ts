import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AtSignExists, SWAGGER_CHARACTER_ID } from '@app/core';
import { Transform } from 'class-transformer';

export class GuildIdDto {
  @ApiProperty(SWAGGER_CHARACTER_ID)
  @IsNotEmpty({ message: '_id is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(({ value: _id }) => _id.toLowerCase())
  readonly _id: string;
}
