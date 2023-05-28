import { Item } from '@app/mongo';
import { IARealm } from '@app/core';

export class ItemGetDto {
  readonly item: Item;

  readonly realm?: IARealm[];
}
