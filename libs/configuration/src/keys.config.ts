import { get } from 'config';
import { KeysInterface } from '@app/configuration/interfaces/keys.interface';

const Keys_Config = get<KeysInterface>('keys');

export const keysConfig: KeysInterface = {
  path: Keys_Config.path,
};
