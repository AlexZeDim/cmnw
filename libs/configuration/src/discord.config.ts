import { get } from 'config';
import { DiscordInterface } from '@app/configuration/interfaces';

const DISCORD_CONFIG = get<DiscordInterface>('discord');

export const discordConfig: DiscordInterface = {
  id: DISCORD_CONFIG.id,
  secret: DISCORD_CONFIG.secret,
  token: DISCORD_CONFIG.token,
  basename: DISCORD_CONFIG.basename,
  callback: DISCORD_CONFIG.callback,
};
