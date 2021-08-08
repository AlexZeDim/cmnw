import { SchemaObject } from 'neode';

export const EntityModel = `
    enum EntityType {
        Entity
        Guild
        Persona
        Item
        Class
        Realm
    }

    type Entity {
        id: ID! @id
        entity: EntityType!
        name: String
        tags: [String]
        languages: [String]
        messages: [Message] @relationship(type: "MENTIONED", direction: IN)
    }
`;

export const EntitySchema: SchemaObject = {
  id: {
    type: 'uuid',
    primary: true,
    required: true,
  },
  name: {
    type: 'string',
    required: true,
  },
  entity: {
    type: 'string',
    required: true,
  },
  tags: {
    type: 'string',
    required: false,
  },
  mentioned_in: {
    type: 'relationship',
    target: 'Message',
    relationship: 'MENTIONED',
    direction: 'in',
    properties: {
      name: 'string'
    }
  }
};
