import {index, modelOptions, mongoose, prop} from "@typegoose/typegoose";

class ItemNames {
  @prop({ required: true })
  public en_US!: string;
  @prop({ required: true })
  public es_MX!: string;
  @prop({ required: true })
  public pt_BR!: string;
  @prop({ required: true })
  public de_DE!: string;
  @prop({ required: true })
  public en_GB!: string;
  @prop({ required: true })
  public es_ES!: string;
  @prop({ required: true })
  public fr_FR!: string;
  @prop({ required: true })
  public it_IT!: string;
  @prop({ required: true })
  public ru_RU!: string;
}

@modelOptions({ schemaOptions: { timestamps: true, collection: 'items' }, options: { customName: 'items' } })
@index({ 'expansion': 1 }, { name: 'C' })
@index(
  {
    'ticker': 'text',
    'name.en_GB': 'text',
    'name.ru_RU': 'text',
    'tags': 'text'
  },
  {
    weights:
      {
        'ticker': 2,
        'name.en_GB': 2,
        'name.ru_RU': 2,
        'tags': 1
      },
    name: 'SQ',
  }
)

export class Item {
  @prop({ required: true })
  public _id!: number;
  @prop({ _id: false, type: ItemNames, timestamps: false })
  public name?: ItemNames;
  @prop()
  public quality?: string;
  @prop()
  public ilvl?: number;
  @prop()
  public level?: number;
  @prop()
  public icon?: string;
  @prop()
  public item_class?: string;
  @prop()
  public item_subclass?: string;
  @prop()
  public purchase_price?: number;
  @prop()
  public purchase_quantity?: number;
  @prop()
  public sell_price?: number;
  @prop()
  public is_equippable?: boolean;
  @prop()
  public is_stackable?: boolean;
  @prop()
  public inventory_type?: string;
  @prop()
  public loot_type?: string;
  @prop({ required: true, default: false })
  public contracts!: boolean;
  /** add via indexAssetClass - csv import */
  @prop({ required: true, default: [], type: String })
  public asset_class!: mongoose.Types.Array<string>;
  /** add via importTaxonomy_CSV('itemsparse') */
  @prop()
  public expansion?: string;
  @prop()
  public stackable?: number;
  /** add via importTaxonomy_CSV('taxonomy') */
  @prop()
  public profession_class?: string;
  @prop()
  public ticker?: string;
  @prop({ required: true, default: [], type: String })
  public tags!: mongoose.Types.Array<string>;
}
