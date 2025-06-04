import { MarketEntity } from '@app/pg';
import { IAuctionsItem, IAuctionsOrder, ICommodityOrder } from '@app/core/types';

export type AuctionItem = Partial<IAuctionsItem> & Pick<IAuctionsItem, 'id'>;

export type ConvertPrice = Partial<
  Pick<IAuctionsOrder, 'bid' | 'buyout'> & Pick<ICommodityOrder, 'unit_price'>
>;

export type AuctionItemExtra = Pick<
  MarketEntity,
  'context' | 'modifiers' | 'bonusList'
>;
