import * as mongoose from 'mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: (): Promise<typeof mongoose> =>
      mongoose.connect(mongoConfig.connectionString, mongoOptionsConfig),
  },
];
