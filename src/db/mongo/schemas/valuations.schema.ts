import {prop, modelOptions} from '@typegoose/typegoose';
import {FlagType, ValuationType} from "../../../interface/constant";

@modelOptions({ schemaOptions: { timestamps: true, collection: 'valuations' }, options: { customName: 'valuations' } })

class Details {
  @prop()
  public wi?: number
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
