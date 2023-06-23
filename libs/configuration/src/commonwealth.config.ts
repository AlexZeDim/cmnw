import { ICommonwealth } from '@app/configuration/interfaces/commonwealth.interface';
import config from 'config';
import { decrypt } from '@app/core';

const COMMONWEALTH_CONFIG = config.get<ICommonwealth>('commonwealth');

export const commonwealthConfig: ICommonwealth = {
  clientId: decrypt(COMMONWEALTH_CONFIG.clientId),
  clientSecret: decrypt(COMMONWEALTH_CONFIG.clientSecret),
  redirectUri: decrypt(COMMONWEALTH_CONFIG.redirectUri),
  port: COMMONWEALTH_CONFIG.port,
  origin: COMMONWEALTH_CONFIG.origin,
};
