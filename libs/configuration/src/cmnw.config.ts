import config from 'config';
import { decrypt } from '@app/core';
import { ICmnw } from '@app/configuration/interfaces';

const COMMONWEALTH_CONFIG = config.get<ICmnw>('cmnw');

export const cmnwConfig: ICmnw = {
  clientId: decrypt(COMMONWEALTH_CONFIG.clientId),
  clientSecret: decrypt(COMMONWEALTH_CONFIG.clientSecret),
  redirectUri: decrypt(COMMONWEALTH_CONFIG.redirectUri),
  port: COMMONWEALTH_CONFIG.port,
  origin: COMMONWEALTH_CONFIG.origin,
};
