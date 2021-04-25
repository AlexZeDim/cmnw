import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongoOptionsConfig: MongooseModuleOptions = {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true,
  poolSize: 10,
  serverSelectionTimeoutMS: 10,
  socketTimeoutMS: 0
}
