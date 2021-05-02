import { get } from 'config';
import { DiscordInterface } from '@app/configuration/interfaces';

const DISCORD_CONFIG = get<DiscordInterface>('commonwealth');

export const discordConfig: DiscordInterface = {
  token: DISCORD_CONFIG.token
};
