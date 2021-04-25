import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongoOptionsConfig: MongooseModuleOptions = {
  connectionName: 'commonwealth',
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true,
  poolSize: 10,
  socketTimeoutMS: 0,
}
