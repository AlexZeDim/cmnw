import { get } from 'config';
import { Neo4jInterface } from '@app/configuration/interfaces';

const NEO4J_CONFIG = get<Neo4jInterface>('neo4j');

export const neo4jConfig: Neo4jInterface = {
  scheme: NEO4J_CONFIG.scheme,
  host: NEO4J_CONFIG.host,
  port: NEO4J_CONFIG.port,
  username: NEO4J_CONFIG.username,
  password: NEO4J_CONFIG.password,
}
