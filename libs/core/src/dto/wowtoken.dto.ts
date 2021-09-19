import { Transform } from 'class-transformer';
import { IsOptional, IsString, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_WOWTOKEN_LIMIT, SWAGGER_WOWTOKEN_REGION } from '@app/core';

export class WowtokenDto {
  @ApiProperty(SWAGGER_WOWTOKEN_REGION)
  @IsString()
  @Transform(({ value: region }) => region.toLowerCase())
  readonly region: 'eu' | 'kr' | 'us' | 'tw'

  @ApiProperty(SWAGGER_WOWTOKEN_LIMIT)
  @IsOptional()
  @Max(250)
  @Transform(({ value: limit }) => Number(limit))
  readonly limit: number;
}
