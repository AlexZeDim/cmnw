import { MongooseModuleOptions } from '@nestjs/mongoose/dist/interfaces/mongoose-options.interface';

export const mongoOptionsConfig: MongooseModuleOptions = {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  useCreateIndex: true,
}
