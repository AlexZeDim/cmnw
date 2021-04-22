import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongoOptionsConfig: MongooseModuleOptions = {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  useCreateIndex: true,
}
