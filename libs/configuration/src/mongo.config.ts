import { get } from 'config';
import { MongoInterface } from '@app/configuration/interfaces';

const DB_Config = get<MongoInterface>('mongo');

export const mongoConfig: MongoInterface = {
  connection_string: DB_Config.connection_string,
};
