import config from 'config';
import { IRedis } from '@app/configuration/interfaces';
import { decrypt } from '@app/core';

const REDIS_CONFIG = config.get<IRedis>('redis');

export const redisConfig = {
  host: decrypt(REDIS_CONFIG.host),
  port: REDIS_CONFIG.port,
  url: `redis://${decrypt(REDIS_CONFIG.host)}:${REDIS_CONFIG.port}`,
  password: decrypt(REDIS_CONFIG.password),
};
