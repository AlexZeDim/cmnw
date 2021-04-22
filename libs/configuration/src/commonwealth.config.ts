import { CommonwealthInterface } from '@app/configuration/interfaces/commonwealth.interface';
import { get } from 'config';

const COMMONWEALTH_CONFIG = get<CommonwealthInterface>('commonwealth');

export const commonwealthConfig: CommonwealthInterface = {
  port: COMMONWEALTH_CONFIG.port,
  origin: COMMONWEALTH_CONFIG.origin,
};
