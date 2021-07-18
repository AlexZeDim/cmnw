import { Module } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, neo4jConfig } from '@app/configuration';
import { Key, Message, KeysSchema, MessagesSchema } from '@app/mongo';
import { Neo4jModule } from 'nest-neo4j/dist';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Message.name, schema: MessagesSchema },
    ]),
    Neo4jModule.forRoot({
      host: neo4jConfig.host,
      password: neo4jConfig.password,
      port: neo4jConfig.port,
      scheme: 'bolt',
      username: neo4jConfig.username,
    }),
  ],
  controllers: [],
  providers: [OracleService],
})
export class OracleModule {}
