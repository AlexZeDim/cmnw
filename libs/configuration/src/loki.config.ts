import { ILoki } from '@app/configuration/interfaces';

export const lokiConfig: ILoki = {
  lokiUrl: process.env.LOKI_URL,
  labels: {
    'label': process.env.NODE_ENV,
  },
  logToConsole: false,
  gzip: false
};
