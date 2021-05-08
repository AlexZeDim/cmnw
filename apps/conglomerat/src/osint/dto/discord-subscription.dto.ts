import {
  LANG,
  NOTIFICATIONS, SWAGGER_DISCORD_AUTHOR_ID, SWAGGER_DISCORD_AUTHOR_NAME, SWAGGER_DISCORD_CHANNEL_ID,
  SWAGGER_DISCORD_CHANNEL_NAME, SWAGGER_DISCORD_LANG,
  SWAGGER_DISCORD_SERVER_ID,
  SWAGGER_DISCORD_SERVER_NAME, SWAGGER_DISCORD_TYPE,
} from '@app/core';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DiscordSubscriptionDto {
  @ApiProperty(SWAGGER_DISCORD_SERVER_ID)
  readonly discord_id: string;

  @ApiProperty(SWAGGER_DISCORD_SERVER_NAME)
  readonly discord_name: string;

  @ApiProperty(SWAGGER_DISCORD_CHANNEL_ID)
  readonly channel_id: string;

  @ApiProperty(SWAGGER_DISCORD_CHANNEL_NAME)
  readonly channel_name: string;

  @ApiProperty(SWAGGER_DISCORD_AUTHOR_ID)
  readonly author_id: string;

  @ApiProperty(SWAGGER_DISCORD_AUTHOR_NAME)
  readonly author_name: string;

  @ApiProperty(SWAGGER_DISCORD_TYPE)
  @IsEnum(NOTIFICATIONS)
  readonly type: NOTIFICATIONS;

  @IsOptional()
  readonly timestamp: number;

  @ApiProperty(SWAGGER_DISCORD_LANG)
  @IsEnum(LANG)
  readonly language: LANG;

  // TODO filters
}
