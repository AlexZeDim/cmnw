import { IMongoConfig } from '@app/configuration/interfaces';

export const mongoConfig: IMongoConfig = {
  connectionString: process.env.connectionString,
};
