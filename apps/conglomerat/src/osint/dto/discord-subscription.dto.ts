import {
  FACTION,
  LANG,
  NOTIFICATIONS,
  RealmConnected,
  SWAGGER_CHARACTER_AVGILVL,
  SWAGGER_CHARACTER_CLASSES,
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
  SWAGGER_DISCORD_LANG,
  SWAGGER_DISCORD_SERVER_ID,
  SWAGGER_DISCORD_SERVER_NAME,
  SWAGGER_DISCORD_TIMESTAMP,
  SWAGGER_DISCORD_TYPE,
  SWAGGER_ITEM_IDS,
  SWAGGER_REALMS_CONNECTED_SHORT,
} from '@app/core';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
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

  @ApiProperty(SWAGGER_DISCORD_TIMESTAMP)
  @IsOptional()
  readonly timestamp: number;

  @ApiProperty(SWAGGER_DISCORD_LANG)
  @IsEnum(LANG)
  readonly language: LANG;

  @ApiProperty(SWAGGER_ITEM_IDS)
  @IsArray()
  @IsOptional()
  readonly items: number[];

  @ApiProperty(SWAGGER_REALMS_CONNECTED_SHORT)
  @IsArray()
  readonly realms: RealmConnected[];

  @ApiProperty(SWAGGER_CHARACTER_CLASSES)
  @IsOptional()
  readonly character_class: string[];

  @ApiProperty(SWAGGER_CHARACTER_DAYS_FROM)
  @IsOptional()
  readonly days_from: number;

  @ApiProperty(SWAGGER_CHARACTER_DAYS_TO)
  @IsOptional()
  readonly days_to: number;

  @ApiProperty(SWAGGER_CHARACTER_AVGILVL)
  @IsOptional()
  readonly average_item_level: number;

  @ApiProperty(SWAGGER_CHARACTER_RIO)
  @IsOptional()
  readonly rio_score: number;

  @ApiProperty(SWAGGER_CHARACTER_WCL)
  @IsOptional()
  readonly wcl_percentile: number;

  @IsOptional()
  readonly tolerance: number;

  @ApiProperty(SWAGGER_CHARACTER_FACTION)
  @IsEnum(FACTION)
  @IsOptional()
  readonly faction: FACTION;

  @ApiProperty(SWAGGER_CHARACTER_LANGUAGES)
  @IsArray()
  @IsOptional()
  readonly languages: string[];
}
