import { IRedis } from '@app/configuration/interfaces';

export const redisConfig: IRedis = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD,
};
