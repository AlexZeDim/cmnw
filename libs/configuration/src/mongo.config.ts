import config from 'config';
import { IMongo } from '@app/configuration/interfaces';
import { decrypt } from '@app/core';

console.log(process.env)

const MONGO_DB_CONFIG = config.get<IMongo>('mongo');

export const mongoConfig: IMongo = {
  connectionString: decrypt(MONGO_DB_CONFIG.connectionString),
};
