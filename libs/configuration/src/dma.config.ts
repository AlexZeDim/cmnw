import { IDmaConfig } from '@app/configuration/interfaces';

export const dmaConfig: IDmaConfig = {
  isIndexAuctions: process.env.DMA_INDEX_AUCTIONS === 'true',
  isIndexCommodity: process.env.DMA_INDEX_COMMODITY === 'true',

  isItemsIndex: process.env.DMA_INDEX_ITEMS === 'true',
  isItemsForceUpdate: process.env.DMA_INDEX_ITEMS_FORCE_UPDATE === 'true',
  isItemsBuild: process.env.DMA_INDEX_ITEMS_BUILD === 'true',

  isItemsPricingInit: process.env.DMA_INDEX_ITEMS_PRICING === 'true',
  isItemsPricingBuild: process.env.DMA_INDEX_ITEMS_PRICING_BUILD === 'true',
  isItemsPricingLab: process.env.DMA_INDEX_ITEMS_PRICING_LAB === 'true',
};
