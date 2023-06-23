import config from 'config';
import { IItems } from '@app/configuration/interfaces';

const ITEMS_CONFIG = config.get<IItems>('valuations');

export const itemsConfig: IItems = {
  index: ITEMS_CONFIG.index,
  updateForce: ITEMS_CONFIG.updateForce,
  build: ITEMS_CONFIG.build,
};
