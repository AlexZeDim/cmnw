import { IsNumberString } from 'class-validator';

export class DiscordUnsubscriptionDto {
  @IsNumberString()
  readonly discord_id: string;

  @IsNumberString()
  readonly channel_id: string;
}
