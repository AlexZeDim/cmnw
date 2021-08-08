import { mergeTypeDefs } from '@graphql-tools/merge';
import { EntityGQLModel, MessageGQLModel } from '@app/neo4j/schemas';

const typesArray = [
  EntityGQLModel,
  MessageGQLModel,
];

const typeDefs = mergeTypeDefs(typesArray);

export const neo4jModel = typeDefs;


