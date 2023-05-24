import { get } from 'config';
import { ItemsInterface } from '@app/configuration/interfaces';

const ITEMS_CONFIG = get<ItemsInterface>('valuations');

export const itemsConfig: ItemsInterface = {
  index_init: ITEMS_CONFIG.index_init,
  index_update_force: ITEMS_CONFIG.index_update_force,
  build_init: ITEMS_CONFIG.build_init,
};
