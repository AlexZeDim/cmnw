import { ICoreConfig } from '@app/configuration/interfaces';

export const coreConfig: ICoreConfig = {
  path: process.env.KEYS_PATH,
  useProxy: process.env.KEYS_USE_PROXY === 'true',
};
