import { Inject, Injectable, Logger } from '@nestjs/common';
import { neo4jModel } from '@app/neo4j';
import neo4j from 'neo4j-driver';
import * as Neode from 'neode';
import { OGM } from '@neo4j/graphql-ogm';
import { ENTITY_NAME } from '@app/core';

@Injectable()
export class BenchService {
  private readonly logger = new Logger(BenchService.name);

  constructor(
    @Inject('Connection') private readonly neode: Neode
  ) {
    this.getHello()
  }

  async getHello(): Promise<void> {
    try {
      await this.neode.deleteAll('Entity');
      // await this.neode.deleteAll('Message');

      await this.neode.create('Entity', {
        name: 'A',
        entity: ENTITY_NAME.Persona
      })

      await this.neode.create('Message', {
        context: 'Text',
      })

      const test = await this.neode.all('Entity', { name: 'A' });
      console.log(test.get(0).get('name'));

/*      const ogm = new OGM({ typeDefs: neo4jModel, driver });
      this.logger.log(ogm)

      const Message = ogm.model('Message');
      const Entity = ogm.model('Entity');
      this.logger.log(Message);

      await Entity.create({ input: [ { name: 'TestEntity', entity: ENTITY_NAME.Entity } ]})
      const create = await Message.create({
        input: [{
          context: 'Test',
          tags: ['test'],
          clearance: ['c'],
          entity: {
            create: [
              {
                name: 'TestEntity',
                entity: ENTITY_NAME.Entity
              }
            ]
          }
        }]
      });
      this.logger.log(create);

      const find = await Message.find({ where: { context: 'Test' } });
      console.log(find);*/
    } catch (e) {
      console.log(e);
    }
  }
}
