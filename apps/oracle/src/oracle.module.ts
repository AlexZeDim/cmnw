import { Module } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';
import { Key, KeysSchema } from '@app/mongo';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema }
    ])
  ],
  controllers: [],
  providers: [OracleService],
})
export class OracleModule {}
