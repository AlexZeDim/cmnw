import { LANG, NOTIFICATIONS } from '@app/core';
import { IsEnum, IsNumberString } from 'class-validator';

export class DiscordSubscriptionDto {
  @IsNumberString()
  readonly discord_id: string;

  @IsNumberString()
  readonly discord_name: string;

  @IsNumberString()
  readonly channel_id: string;

  @IsNumberString()
  readonly channel_name: string;

  @IsNumberString()
  readonly author_id: string;

  @IsNumberString()
  readonly author_name: string;

  @IsEnum(NOTIFICATIONS)
  readonly type: NOTIFICATIONS;

  @IsNumberString()
  readonly timestamp: number;

  @IsEnum(LANG)
  readonly language: LANG;

  // TODO filters
}
