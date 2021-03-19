import {prop, modelOptions, mongoose} from '@typegoose/typegoose';
import {FlagType, ValuationType} from "../../../interface/constant";
import {Item} from "./items.schema";

@modelOptions({ schemaOptions: { timestamps: true, collection: 'valuations' }, options: { customName: 'valuations' } })

class ItemValuations extends Item {
  @prop({ required: true })
  public value!: number;
  @prop({ required: true })
  public quantity!: number;
}

class Details {
  @prop()
  public wi?: number;
  @prop()
  public quotation?: string;
  @prop()
  public lot_size?: number;
  @prop()
  public minimal_settlement_amount?: number;
  @prop()
  public description?: string;
  @prop()
  public swap_type?: string;
  @prop()
  public min_price?: number;
  @prop()
  public quantity?: number;
  @prop()
  public open_interest?: number;
  @prop({ type: Number })
  public orders?: number[];
  @prop({ default: [], type: ItemValuations })
  public reagent_items?: mongoose.Types.Array<ItemValuations>;
}

export class Valuations {
  @prop({ required: true })
  public item_id!: number;
  @prop({ required: true })
  public connected_realm_id!: number;
  @prop({ required: true })
  public last_modified!: number;
  @prop({ required: true })
  public value!: number;
  @prop()
  public name?: string;
  @prop({ enum: FlagType })
  public flag?: string;
  @prop({ enum: ValuationType })
  public type?: string;
  @prop()
  public details?: Details;
}

//TODO to lowercase or uppercase asset classes, flag and types
