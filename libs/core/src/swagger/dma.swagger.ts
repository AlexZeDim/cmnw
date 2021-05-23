import { ApiProperty, ApiPropertyOptions, getSchemaPath } from '@nestjs/swagger';

export const SWAGGER_DATASET_X: ApiPropertyOptions = {
  name: 'x',
  type: Number,
  description: 'Represents index value for chart by X axis'
}

export const SWAGGER_DATASET_Y: ApiPropertyOptions = {
  name: 'y',
  type: Number,
  description: 'Represents index value for chart by Y axis'
}

export const SWAGGER_DATASET_ORDERS: ApiPropertyOptions = {
  name: 'orders',
  type: Number,
  description: 'Represents the number of unique orders on price level'
}

export const SWAGGER_DATASET_VALUE: ApiPropertyOptions = {
  name: 'value',
  type: Number,
  description: 'Represents the amount or quantity of item on price level'
}

export const SWAGGER_DATASET_OPEN_INTEREST: ApiPropertyOptions = {
  name: 'oi',
  type: Number,
  description: 'Represents open interest for required item on price level'
}

class OrderDataSet {
  @ApiProperty(SWAGGER_DATASET_X)
  readonly x: number;

  @ApiProperty(SWAGGER_DATASET_Y)
  readonly y: number;

  @ApiProperty(SWAGGER_DATASET_ORDERS)
  readonly orders: number;

  @ApiProperty(SWAGGER_DATASET_VALUE)
  readonly value: number;

  @ApiProperty(SWAGGER_DATASET_OPEN_INTEREST)
  readonly oi: number;
}

export const SWAGGER_ITEM_CHART_Y_AXIS: ApiPropertyOptions = {
  name: 'yAxis',
  type: () => [Number],
  isArray: true,
  example: [1, 2, 3, 4, 5]
}

export const SWAGGER_ITEM_CHART_X_AXIS: ApiPropertyOptions = {
  name: 'xAxis',
  isArray: true,
  items: {
    oneOf: [
      { $ref: getSchemaPath(Number) },
      { $ref: getSchemaPath(String) },
      { $ref: getSchemaPath(Date) },
    ],
  },
  example: [1, 'gordunni', new Date()]
}

export const SWAGGER_ITEM_CHART_DATASET: ApiPropertyOptions = {
  name: 'dataset',
  type: () => OrderDataSet,
  description: 'This field is a dataset for HighCharts',
  example: {
    x: 0,
    y: 0,
    orders: 20,
    value: 123,
    oi: 550
  }
}

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
