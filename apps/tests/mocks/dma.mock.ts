import {
  objectNamedProperty,
  objectPropRef,
  objectPropRefId,
  propRefLink,
} from './osint.mock';

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

export const item = {
  _links: { self: expect.objectContaining(propRefLink) },
  id: expect.any(Number),
  name: expect.any(String),
  quality: expect.objectContaining(objectNamedProperty),
  level: expect.any(Number),
  required_level: expect.any(Number),
  media: expect.objectContaining(objectPropRefId),
  item_class: expect.objectContaining(objectPropRef),
  item_subclass: expect.objectContaining(objectPropRef),
  inventory_type: expect.objectContaining(objectNamedProperty),
  purchase_price: expect.any(Number),
  sell_price: expect.any(Number),
  max_count: expect.any(Number),
  preview_item: expect.anything(),
  is_equippable: expect.any(Boolean),
  is_stackable: expect.any(Boolean),
  purchase_quantity: expect.any(Number),
  modified_crafting: expect.anything(),
  lastModified: expect.any(String),
};

export const itemMedia = {
  _links: { self: expect.objectContaining(propRefLink) },
  id: expect.any(Number),
  lastModified: expect.any(String),
};
