import config from 'config';
import { IDiscord } from '@app/configuration/interfaces';
import { decrypt } from '@app/core';

const DISCORD_CONFIG = config.get<IDiscord>('discord');

export const discordConfig: IDiscord = {
  id: decrypt(DISCORD_CONFIG.id),
  secret: decrypt(DISCORD_CONFIG.secret),
  token: decrypt(DISCORD_CONFIG.token),
  basename: DISCORD_CONFIG.basename,
  callback: DISCORD_CONFIG.callback,
};
