import { get } from 'config';
import { YandexInterface } from '@app/configuration/interfaces';

const YANDEX_CONFIG = get<YandexInterface>('yandex');

export const yandexConfig: YandexInterface = {
  token: YANDEX_CONFIG.token,
};
