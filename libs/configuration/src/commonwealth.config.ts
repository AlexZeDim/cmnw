import { ICommonwealth } from '@app/configuration/interfaces/commonwealth.interface';
import { get } from 'config';

const COMMONWEALTH_CONFIG = get<ICommonwealth>('commonwealth');

export const commonwealthConfig: ICommonwealth = {
  clientId: COMMONWEALTH_CONFIG.clientId,
  clientSecret: COMMONWEALTH_CONFIG.clientSecret,
  redirect: COMMONWEALTH_CONFIG.redirect,
  port: COMMONWEALTH_CONFIG.port,
  origin: COMMONWEALTH_CONFIG.origin,
};
