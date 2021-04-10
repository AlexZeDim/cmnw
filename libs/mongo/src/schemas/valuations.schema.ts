import { Document } from "mongoose";
import { Prop, SchemaFactory } from '@nestjs/mongoose';

class ItemValuations extends Item {
  @Prop({ required: true })
  value: number;
  
  @Prop({ required: true })
  quantity: number;
}

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
  reagent_items: mongoose.Types.Array<ItemValuations>;
}

export class Valuations {
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
  
  @Prop({ enum: FlagType })
  flag: string;
  
  @Prop({ enum: ValuationType })
  type: string;
  
  @Prop()
  details: Details;
}

export const ValuationsSchema = SchemaFactory.createForClass(Valuations);


//TODO to lowercase or uppercase asset classes, flag and types