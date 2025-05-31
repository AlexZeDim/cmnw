import config from 'config';
import { decrypt } from '@app/core';
import { ICmnw } from '@app/configuration/interfaces';

const CMNW_CONFIG = config.get<ICmnw>('cmnw');

export const cmnwConfig: ICmnw = {
  clientId: decrypt(CMNW_CONFIG.clientId),
  clientSecret: decrypt(CMNW_CONFIG.clientSecret),
  redirectUri: decrypt(CMNW_CONFIG.redirectUri),
  port: CMNW_CONFIG.port,
  origin: CMNW_CONFIG.origin,
};
