import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import {
  SWAGGER_ACCOUNT_BATTLE_TAG,
  SWAGGER_ACCOUNT_CRYPTONYM,
  SWAGGER_ACCOUNT_DISCORD_ID,
  SWAGGER_ACCOUNT_NICKNAME,
} from '@app/core';

export class AccountGetDto {
  @IsString()
  @IsOptional()
  @ApiProperty(SWAGGER_ACCOUNT_DISCORD_ID)
  readonly discord_id: string;

  @IsString()
  @IsOptional()
  @ApiProperty(SWAGGER_ACCOUNT_BATTLE_TAG)
  readonly battle_tag: string;

  @IsString()
  @IsOptional()
  @ApiProperty(SWAGGER_ACCOUNT_NICKNAME)
  readonly nickname: string;

  @IsString()
  @IsOptional()
  @ApiProperty(SWAGGER_ACCOUNT_CRYPTONYM)
  readonly cryptonym: string;
}
