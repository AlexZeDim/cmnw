import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongoOptionsConfig: MongooseModuleOptions = {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true,
  poolSize: 10,
  socketTimeoutMS: 1000 * 60 * 60,
  connectTimeoutMS: 1000 * 60 * 60
}
