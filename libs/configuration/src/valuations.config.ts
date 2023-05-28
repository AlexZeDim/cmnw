import { get } from 'config';
import { ValuationsInterface } from '@app/configuration/interfaces';

const VALUATIONS_CONFIG = get<ValuationsInterface>('valuations');

export const valuationsConfig: ValuationsInterface = {
  build_init: VALUATIONS_CONFIG.build_init,
};
