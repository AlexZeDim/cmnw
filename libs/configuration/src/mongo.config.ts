import config from 'config';
import process from 'node:process';
import { IMongo } from '@app/configuration/interfaces';
import { decrypt } from '@app/core';

console.log(process.env);

console.log(config);

const MONGO_DB_CONFIG = config.get<IMongo>('mongo');

export const mongoConfig: IMongo = {
  connectionString: decrypt(MONGO_DB_CONFIG.connectionString),
};
