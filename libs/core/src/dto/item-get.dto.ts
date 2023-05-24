import { LeanDocument } from 'mongoose';
import { Item } from '@app/mongo';
import { IARealm } from '@app/core';

export class ItemGetDto {
  readonly item: LeanDocument<Item>;

  readonly realm?: IARealm[];
}
