import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  NOTIFICATIONS,
  IDiscordSubscription,
  SWAGGER_CHARACTER_DAYS_FROM,
  SWAGGER_CHARACTER_DAYS_TO,
  SWAGGER_CHARACTER_FACTION,
  SWAGGER_CHARACTER_LANGUAGES,
  SWAGGER_CHARACTER_RIO,
  SWAGGER_CHARACTER_WCL,
  SWAGGER_DISCORD_AUTHOR_ID,
  SWAGGER_DISCORD_AUTHOR_NAME,
  SWAGGER_DISCORD_CHANNEL_ID,
  SWAGGER_DISCORD_CHANNEL_NAME,
  SWAGGER_DISCORD_SERVER_ID,
  SWAGGER_DISCORD_SERVER_NAME,
  SWAGGER_DISCORD_TYPE,
  SWAGGER_ITEM,
  SWAGGER_CHARACTER_CLASS,
  SWAGGER_CONNECTED_REALM_ID,
  SWAGGER_CHARACTER_ILVL,
  SWAGGER_REALMS_LOCALE,
  SWAGGER_DISCORD_ID,
} from '@app/core';

export class DiscordSubscriptionDto implements IDiscordSubscription{
  @ApiProperty(SWAGGER_DISCORD_ID)
  readonly _id: string;

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
  readonly type: NOTIFICATIONS;

  @ApiProperty(SWAGGER_REALMS_LOCALE)
  @IsOptional()
  readonly realms: string;

  @ApiProperty(SWAGGER_CHARACTER_CLASS)
  @IsOptional()
  readonly character_class: string;

  @ApiProperty(SWAGGER_CHARACTER_DAYS_FROM)
  @IsOptional()
  readonly days_from: number;

  @ApiProperty(SWAGGER_CHARACTER_DAYS_TO)
  @IsOptional()
  readonly days_to: number;

  @ApiProperty(SWAGGER_CHARACTER_ILVL)
  @IsOptional()
  readonly item_level: number;

  @ApiProperty(SWAGGER_CHARACTER_RIO)
  @IsOptional()
  readonly rio_score: number;

  @ApiProperty(SWAGGER_CHARACTER_WCL)
  @IsOptional()
  readonly wcl_percentile: number;

  @ApiProperty(SWAGGER_CHARACTER_FACTION)
  @IsOptional()
  readonly faction: string;

  @ApiProperty(SWAGGER_CHARACTER_LANGUAGES)
  @IsOptional()
  readonly languages: string;

  @ApiProperty(SWAGGER_ITEM)
  @IsOptional()
  readonly item: string;

  @ApiProperty(SWAGGER_CONNECTED_REALM_ID)
  @IsOptional()
  readonly connected_realm_id: number;
}
