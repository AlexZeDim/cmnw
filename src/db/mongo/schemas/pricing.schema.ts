import {prop, modelOptions, index, mongoose, Severity} from '@typegoose/typegoose';
import { PricingType } from "../../../interface/constant";

@modelOptions({ schemaOptions: { timestamps: true, collection: 'pricing_methods' }, options: { customName: 'pricing_methods', allowMixed: Severity.ALLOW } })
@index({ 'derivatives._id': -1, 'type': 1 }, { name: 'GET' })

class Item {
  @prop({ required: true })
  _id!: number;
  @prop({ required: true, default: 0 })
  quantity!: number;
}

class ModifiedCraftingSlot {
  @prop({ required: true })
  public _id!: number;
}

class Locales {
  @prop()
  public en_US?: string;
  @prop()
  public es_MX?: string;
  @prop()
  public pt_BR?: string;
  @prop()
  public de_DE?: string;
  @prop()
  public en_GB?: string;
  @prop()
  public es_ES?: string;
  @prop()
  public fr_FR?: string;
  @prop()
  public it_IT?: string;
  @prop()
  public ru_RU?: string;
  @prop()
  public ko_KR?: string;
  @prop()
  public zh_TW?: string;
  @prop()
  public zh_CN?: string;
}

export class Pricing {
  @prop()
  public ticker?: string;
  @prop({ _id: false, timestamp: false, type: Locales })
  public name?: Locales;
  @prop({ _id: false, timestamp: false, type: Locales })
  public description?: Locales;
  @prop()
  public faction?: string;
  @prop()
  public media?: string;
  /**
   * API or LOCAL
   *
   * SkillLineAbility.lua
   * see https://us.forums.blizzard.com/en/blizzard/t/bug-professions-api/6234 for details
   *
   * Build from item_id & item_quantity
   * for massive proportion evaluation
   * {id: Number, Quantity: Number}
   */
  @prop({ required: true, default: [], type: Item })
  public derivatives!: mongoose.Types.Array<Item>;
  @prop({ required: true, default: [], type: Item })
  public reagents!: mongoose.Types.Array<Item>;
  @prop({ required: true, default: [], index: true })
  public recipe_id!: number;
  @prop({ index: true })
  public spell_id?: number;
  @prop({ default: [], type: ModifiedCraftingSlot })
  public modified_crafting_slots?: ModifiedCraftingSlot[];
  /** if Local then Convert from SkillLine */
  @prop()
  public profession?: string;
  /** API */
  @prop()
  public expansion?: string;
  @prop()
  public rank?: number;
  @prop({ required: true, enum: PricingType })
  public type?: string;
  @prop({ required: true, default: false })
  public single_premium!: boolean;
  @prop()
  public create_by?: string;
  @prop()
  public updated_by?: string;
}
