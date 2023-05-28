import { get } from 'config';
import { IDiscord } from '@app/configuration/interfaces';

const DISCORD_CONFIG = get<IDiscord>('discord');

export const discordConfig: IDiscord = {
  id: DISCORD_CONFIG.id,
  secret: DISCORD_CONFIG.secret,
  token: DISCORD_CONFIG.token,
  basename: DISCORD_CONFIG.basename,
  callback: DISCORD_CONFIG.callback,
};
