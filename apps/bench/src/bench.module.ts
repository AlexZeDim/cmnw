import { Module } from '@nestjs/common';
import { BenchService } from './bench.service';
import { NeodeModule } from 'neode-nestjs/dist';
import { EntitySchema, MessageSchema } from '@app/neo4j';

@Module({
  imports: [
    NeodeModule.forRoot(
      { host: 'bolt://localhost:7687', port: 7689, username: 'neo4j', password: 'test' }
    ),
    NeodeModule.forFeature({ Entity: EntitySchema, Message: MessageSchema }),
  ],
  controllers: [],
  providers: [BenchService],
})
export class BenchModule {}
