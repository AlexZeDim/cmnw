import { get } from 'config';
import { DiscordInterface } from '@app/configuration/interfaces';

const DISCORD_CONFIG = get<DiscordInterface>('discord');

export const discordConfig: DiscordInterface = {
  token: DISCORD_CONFIG.token,
  basename: DISCORD_CONFIG.basename
};
