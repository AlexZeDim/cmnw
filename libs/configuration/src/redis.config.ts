import config from 'config';
import { IRedis } from '@app/configuration/interfaces';
import { decrypt } from '@app/core';

const REDIS_CONFIG = config.get<IRedis>('redis');

console.log(REDIS_CONFIG);

export const redisConfig = {
  host: decrypt(REDIS_CONFIG.host),
  port: REDIS_CONFIG.port,
  password: decrypt(REDIS_CONFIG.password),
};
