import { ApiProperty } from '@nestjs/swagger';
import {
  SWAGGER_ACCOUNT_BATTLE_TAG,
  SWAGGER_ACCOUNT_CRYPTONYM,
  SWAGGER_ACCOUNT_DISCORD_ID,
  SWAGGER_ACCOUNT_NICKNAME,
} from '@app/core';

export class AccountGetDto {
  @ApiProperty(SWAGGER_ACCOUNT_DISCORD_ID)
  readonly discord_id: string;

  @ApiProperty(SWAGGER_ACCOUNT_BATTLE_TAG)
  readonly battle_tag: string;

  @ApiProperty(SWAGGER_ACCOUNT_NICKNAME)
  readonly nickname: string;

  @ApiProperty(SWAGGER_ACCOUNT_CRYPTONYM)
  readonly cryptonym: string;
}
