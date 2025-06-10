import { ILoki } from '@app/configuration/interfaces';

export const lokiConfig: ILoki = {
  lokiUrl: process.env.LOKI_URL,
  logToLoki: process.env.NODE_ENV === 'production',
  logToConsole: true,
  gzip: false
};
