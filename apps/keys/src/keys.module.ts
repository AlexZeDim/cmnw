import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig } from '@app/configuration';
import { Key, KeysSchema } from '@app/mongo';
import { KeysService } from './keys.service';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Key.name, schema: KeysSchema }]),
  ],
  controllers: [],
  providers: [KeysService],
})
export class KeysModule {}
