import { ILokiConfig } from '@app/configuration/interfaces';

export const lokiConfig: ILokiConfig = {
  lokiUrl: process.env.LOKI_URL,
  logToLoki: process.env.NODE_ENV === 'production',
  logToConsole: process.env.NODE_ENV !== 'production',
  gzip: false
};
