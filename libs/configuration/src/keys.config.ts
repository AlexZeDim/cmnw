import config from 'config';
import { IKeys } from '@app/configuration/interfaces';

const KEYS_CONFIG = config.get<IKeys>('keys');

export const keysConfig: IKeys = {
  path: KEYS_CONFIG.path,
};
