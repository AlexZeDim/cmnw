import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongoOptionsConfig: MongooseModuleOptions = {
  socketTimeoutMS: 1000 * 60 * 60,
  connectTimeoutMS: 1000 * 60 * 60,
};
