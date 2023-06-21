import { propRefLink } from '@app/e2e/characters/osint.types';

export const itemRef = {
  id: expect.any(Number),
};

export const commodityItem = {
  id: expect.any(Number),
  item: expect.objectContaining(itemRef),
  quantity: expect.any(Number),
  unit_price: expect.any(Number),
  time_left: expect.any(String),
};

export const commodityListing = {
  auctions: expect.arrayContaining([
    expect.objectContaining(commodityItem),
  ]),
};

export class Class {
  auctions: Array<TCommodityItem>;
}

export type TCommodityItem = {
  id: number,
  item: TItemRef,
  quantity: number,
  unit_price: number,
  time_left: string,
};

export type TItemRef = {
  id: number,
};

