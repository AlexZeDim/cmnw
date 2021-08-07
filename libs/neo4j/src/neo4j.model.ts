import { mergeTypeDefs } from '@graphql-tools/merge';
import { EntityModel, MessageModel } from '@app/neo4j/schemas';

const typesArray = [
  EntityModel,
  MessageModel,
];

const typeDefs = mergeTypeDefs(typesArray);

export const neo4jModel = typeDefs;


