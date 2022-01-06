import { get } from 'config';
import { ElasticInterface } from '@app/configuration/interfaces';

const ELASTIC_CONFIG = get<ElasticInterface>('elastic');

export const elasticConfig: ElasticInterface = {
  host: ELASTIC_CONFIG.host,
  username: ELASTIC_CONFIG.username,
  password: ELASTIC_CONFIG.password,
  port: ELASTIC_CONFIG.port,
}
