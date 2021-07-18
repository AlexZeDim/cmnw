import { Module } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, neo4jConfig } from '@app/configuration';
import { Key, Message, KeysSchema, MessagesSchema } from '@app/mongo';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Message.name, schema: MessagesSchema },
    ]),
  ],
  controllers: [],
  providers: [OracleService],
})
export class OracleModule {}
