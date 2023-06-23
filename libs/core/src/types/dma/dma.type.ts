import { IAuctionsItem, IWowToken } from '@app/core/types';

export type AuctionItem = Partial<IAuctionsItem> & Pick<IAuctionsItem, 'id'>;
