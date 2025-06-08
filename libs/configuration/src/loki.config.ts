import { ILoki } from '@app/configuration/interfaces';
import process from 'node:process';

export const lokiConfig: ILoki = {
  lokiUrl: process.env.LOKI_URL,
  labels: {
    'label': process.env.NODE_ENV,
  },
  logToConsole: false,
  gzip: false
};
