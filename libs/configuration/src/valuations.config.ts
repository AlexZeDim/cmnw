import { get } from 'config';
import { IValuations } from '@app/configuration/interfaces';

const VALUATIONS_CONFIG = get<IValuations>('valuations');

export const valuationsConfig: IValuations = {
  build: VALUATIONS_CONFIG.build,
};
