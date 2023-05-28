import { get } from 'config';
import { IYandex } from '@app/configuration/interfaces';

const YANDEX_CONFIG = get<IYandex>('yandex');

export const yandexConfig: IYandex = {
  token: YANDEX_CONFIG.token,
};
