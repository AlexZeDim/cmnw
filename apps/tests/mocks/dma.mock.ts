import { propRefLink } from './osint.mock';

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

export const wowTokenItem = {
  _links: { self: expect.objectContaining(propRefLink) },
  last_updated_timestamp: expect.any(Number),
  price: expect.any(Number),
  lastModified: expect.any(String),
};

export const commodityListing = {
  auctions: expect.arrayContaining([expect.objectContaining(commodityItem)]),
};
