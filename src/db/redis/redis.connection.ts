import IORedis from 'ioredis';

export const redisConnection = new IORedis(1);
