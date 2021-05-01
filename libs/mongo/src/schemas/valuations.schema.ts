import { Document, Types } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FLAG_TYPE, VALUATION_TYPE } from '@app/core';

@Schema()
class ItemValuations {
  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  quantity: number;
}

@Schema()
class Details {
  @Prop()
  wi: number;

  @Prop()
  quotation: string;

  @Prop()
  lot_size: number;

  @Prop()
  minimal_settlement_amount: number;

  @Prop()
  description: string;

  @Prop()
  swap_type: string;

  @Prop()
  min_price: number;

  @Prop()
  quantity: number;

  @Prop()
  open_interest: number;

  @Prop()
  orders: number[];

  @Prop({ default: [] })
  reagent_items: Types.Array<ItemValuations>;
}

@Schema()
export class Valuations extends Document {
  @Prop({ required: true })
  item_id: number;

  @Prop({ required: true })
  connected_realm_id: number;

  @Prop({ required: true })
  last_modified: number;

  @Prop({ required: true })
  value: number;

  @Prop()
  name: string;

  @Prop({ enum: FLAG_TYPE })
  flag: string;

  @Prop({ enum: VALUATION_TYPE })
  type: string;

  @Prop()
  details: Details;
}

export const ValuationsSchema = SchemaFactory.createForClass(Valuations);


//TODO to lowercase or uppercase asset classes, flag and types
