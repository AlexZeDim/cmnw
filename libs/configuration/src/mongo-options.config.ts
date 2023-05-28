import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongoOptionsConfig: MongooseModuleOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  socketTimeoutMS: 1000 * 60 * 60,
  connectTimeoutMS: 1000 * 60 * 60,
};
