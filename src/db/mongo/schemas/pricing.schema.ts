import {prop, modelOptions, index, mongoose} from '@typegoose/typegoose';
import { PricingType } from "../../../interface/constant";

@modelOptions({ schemaOptions: { timestamps: true, collection: 'pricing_methods' }, options: { customName: 'pricing_methods', allowMixed: 0 } })
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

export class Pricing {
  @prop()
  public ticker?: string;
  @prop({ _id: false, timestamp: false })
  public name?: object;
  @prop({ _id: false, timestamp: false })
  public description?: object;
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
  @prop({ required: true })
  public derivatives!: mongoose.Types.Array<Item>;
  @prop({ required: true, default: [] })
  public reagents!: mongoose.Types.Array<Item>;
  @prop({ required: true, default: [], index: true })
  public recipe_id!: number;
  @prop({ index: true })
  public spell_id?: number;
  @prop({ default: [] })
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
