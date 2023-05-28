import { get } from 'config';
import { IPrice } from '@app/configuration/interfaces';

const PRICING_CONFIG = get<IPrice>('valuations');

export const pricingConfig: IPrice = {
  init: PRICING_CONFIG.init,
  build: PRICING_CONFIG.build,
  libPricing: PRICING_CONFIG.libPricing,
};
