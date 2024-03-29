import config from 'config';
import { IYandex } from '@app/configuration/interfaces';
import { decrypt } from '@app/core';

const YANDEX_CONFIG = config.get<IYandex>('yandex');

export const yandexConfig: IYandex = {
  token: decrypt(YANDEX_CONFIG.token),
};
