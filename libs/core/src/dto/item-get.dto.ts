import { LeanDocument } from 'mongoose';
import { Item } from '@app/mongo';
import { IARealm } from '@app/core';

class ItemLocaleNames {
  en_US: string;

  es_MX: string;

  pt_BR: string;

  de_DE: string;

  en_GB: string;

  es_ES: string;

  fr_FR: string;

  it_IT: string;

  ru_RU: string;
}

// TODO decorate with fields with @ApiProperty
class ItemEmbedDto implements Omit<LeanDocument<Item>, 'asset_class' | 'tags'> {

  readonly _id: number;

  readonly name: ItemLocaleNames;

  readonly quality: string;

  readonly ilvl: number;

  readonly level: number;

  readonly icon: string;

  readonly item_class: string;

  readonly item_subclass: string;

  readonly purchase_price: number;

  readonly purchase_quantity: number;

  readonly sell_price: number;

  readonly is_equippable: boolean;

  readonly is_stackable: boolean;

  readonly inventory_type: string;

  readonly loot_type: string;

  readonly contracts: boolean;

  readonly asset_class: string[]; // TODO array of enums

  readonly expansion: string;

  readonly stackable: number;

  readonly profession_class: string;

  readonly ticker: string;

  readonly tags: string[];
}

export class ItemGetDto {
  readonly item: LeanDocument<Item>

  readonly realm: IARealm[]
}
