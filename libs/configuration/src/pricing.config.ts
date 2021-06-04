import { get } from 'config';
import { PricingInterface } from '@app/configuration/interfaces';

const PRICING_CONFIG = get<PricingInterface>('valuations');

export const pricingConfig: PricingInterface = {
  pricing_init: PRICING_CONFIG.pricing_init,
  build_init: PRICING_CONFIG.build_init,
}
