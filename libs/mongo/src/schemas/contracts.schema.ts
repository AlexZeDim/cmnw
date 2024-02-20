import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Item } from '@app/mongo/schemas/items.schema';

@Schema({ timestamps: true })
export class Contract extends Document {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: Number, required: true, ref: 'Item' })
  item_id: number | Item;

  @Prop({ type: Number, required: true, ref: 'Realm' })
  connected_realm_id: number;

  @Prop({ type: Number, required: true })
  last_modified: number;

  @Prop({ type: { day: Number, week: Number, month: Number, year: Number } })
  date: {
    day: number;
    week: number;
    month: number;
    year: number;
  };

  @Prop({ type: Number })
  price: number;

  @Prop({ type: Number })
  price_size: number;

  @Prop({ type: Number })
  quantity: number;

  @Prop({ type: Number })
  open_interest: number;

  @Prop({ default: [], type: [Number] })
  orders: Types.Array<number>;

  @Prop({ default: [], type: [String] })
  sellers: Types.Array<string>;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export const ContractsSchema = SchemaFactory.createForClass(Contract);
