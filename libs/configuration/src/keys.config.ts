import { get } from 'config';
import { IKeys } from '@app/configuration/interfaces';

const KEYS_CONFIG = get<IKeys>('keys');

export const keysConfig: IKeys = {
  path: KEYS_CONFIG.path,
};
