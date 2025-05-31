import { IMongo } from '@app/configuration/interfaces';

export const mongoConfig: IMongo = {
  connectionString: process.env.connectionString,
};
