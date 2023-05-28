import { get } from 'config';
import { IMongo } from '@app/configuration/interfaces';

const MONGO_DB_CONFIG = get<IMongo>('mongo');

export const mongoConfig: IMongo = {
  connectionString: MONGO_DB_CONFIG.connectionString,
};
