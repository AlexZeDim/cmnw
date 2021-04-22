import { get } from 'config';
import { RedisInterface } from '@app/configuration/interfaces';

const Redis_Config = get<RedisInterface>('redis');

export const redisConfig = {
  host: Redis_Config.host,
  port: Redis_Config.port,
};
