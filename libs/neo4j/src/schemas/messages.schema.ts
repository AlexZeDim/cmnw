import { SchemaObject } from 'neode';

export const MessageGQLModel = `
  type Message {
    id: ID! @id
    context: String
    tags: [String]
    clearance: [String]
    entity: [Entity] @relationship(type: "MENTIONED", direction: OUT)
    source: String
  }
`

export const MessageSchema: SchemaObject = {
  id: {
    type: 'uuid',
    primary: true,
    required: true,
  },
  context: {
    type: 'string',
    required: true,
  },
  tags: {
    type: 'string',
    required: false,
  },
  mentioned: {
    type: 'relationship',
    target: 'Entity',
    relationship: 'MENTIONED',
    direction: 'out',
    properties: {
      name: 'string'
    }
  }
};
