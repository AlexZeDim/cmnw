import { Item } from '@app/mongo';
import { IARealm } from '@app/resources';

export class ItemGetDto {
  readonly item: Item;

  readonly realm?: IARealm[];
}
