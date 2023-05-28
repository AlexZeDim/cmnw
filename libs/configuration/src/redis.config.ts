import { get } from 'config';
import { IRedis } from '@app/configuration/interfaces';

const REDIS_CONFIG = get<IRedis>('redis');

export const redisConfig = {
  host: REDIS_CONFIG.host,
  port: REDIS_CONFIG.port,
  password: REDIS_CONFIG.password,
};
