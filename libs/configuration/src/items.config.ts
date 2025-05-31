import { IItems } from '@app/configuration/interfaces';

export const itemsConfig: IItems = {
  itemsIndex: process.env.ITEMS_INDEX === 'true',
  itemsForceUpdate: process.env.ITEMS_FORCE_UPDATE === 'true',
  itemsBuild: process.env.ITEMS_BUILD === 'true',

  itemsPricingInit: process.env.ITEMS_PRICING_INIT === 'true',
  itemsPricingBuild: process.env.ITEMS_PRICING_BUILD === 'true',
  itemsPricingLab: process.env.ITEMS_PRICING_LAB === 'true',
};
