import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongoOptionsConfig: MongooseModuleOptions = {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  socketTimeoutMS: (1000 * 60 * 60 * 24)
}
