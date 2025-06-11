import { IKeys } from '@app/configuration/interfaces';

export const keysConfig: IKeys = {
  path: process.env.KEYS_PATH,
  useProxy: process.env.KEYS_USE_PROXY === 'true',
};
