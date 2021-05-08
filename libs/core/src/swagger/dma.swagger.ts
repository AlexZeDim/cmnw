import { ApiPropertyOptions } from '@nestjs/swagger';

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
