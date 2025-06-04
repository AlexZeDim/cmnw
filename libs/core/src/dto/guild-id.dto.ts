import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AtSignExists, SWAGGER_GUILD_GUID } from '@app/core';
import { Transform } from 'class-transformer';

export class GuildIdDto {
  @ApiProperty(SWAGGER_GUILD_GUID)
  @IsNotEmpty({ message: 'guid is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(({ value: guid }) => guid.toLowerCase())
  readonly guid: string;
}
