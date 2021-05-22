import { ApiPropertyOptions } from '@nestjs/swagger';

export const SWAGGER_ITEM_CROSS_REALM: ApiPropertyOptions = {
  name: '_id',
  description: 'Request item by query (ID, ticker, name) and connected_realm (id, slug, name)',
  type: String,
  required: true,
  nullable: false,
  example: '171276@gordunni',
}

export const SWAGGER_ITEM_IDS: ApiPropertyOptions = {
  name: 'items',
  description: 'Array of unique items IDs',
  required: false,
  type: [Number],
  isArray: true,
  example: [153403, 174305]
}

class RealmConnected {
  readonly _id: number;

  readonly auctions: number;

  readonly golds: number;

  readonly valuations: number;
}

export const SWAGGER_REALMS_CONNECTED_SHORT: ApiPropertyOptions = {
  name: 'realms',
  description: 'Array of connected realms with timestamps',
  type: () => RealmConnected,
  isArray: true,
  example: [{
    _id: 1602,
    auctions: 0,
    golds: 0,
    valuations: 0
  }]
}
