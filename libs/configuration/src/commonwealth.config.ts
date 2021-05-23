import { CommonwealthInterface } from '@app/configuration/interfaces/commonwealth.interface';
import { get } from 'config';

const COMMONWEALTH_CONFIG = get<CommonwealthInterface>('commonwealth');

export const commonwealthConfig: CommonwealthInterface = {
  client_id: COMMONWEALTH_CONFIG.client_id,
  client_secret: COMMONWEALTH_CONFIG.client_secret,
  redirect_uri: COMMONWEALTH_CONFIG.redirect_uri,
  port: COMMONWEALTH_CONFIG.port,
  origin: COMMONWEALTH_CONFIG.origin,
};
