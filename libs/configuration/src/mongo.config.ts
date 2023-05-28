import { get } from 'config';
import { IMongo } from '@app/configuration/interfaces';

const DB_CONFIG = get<IMongo>('mongo');

export const mongoConfig: IMongo = {
  connectionString: DB_CONFIG.connectionString,
};
