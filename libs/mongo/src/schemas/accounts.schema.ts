import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ALIAS_KEY } from '@app/core';

@Schema()
class Alias {
  @Prop({ type: String, enum: ALIAS_KEY })
  key: string;

  @Prop({ type: String })
  value: string;
}

@Schema()
export class Account extends Document {
  @Prop({ type: String, required: true, default: 'Anonymous' })
  cryptonym: string;

  @Prop({ type: String })
  tags: string[];

  @Prop({ _id: false })
  alias: Alias[]
}

export const AccountsSchema = SchemaFactory.createForClass(Account);
AccountsSchema.index({ 'aliases.key': 1, 'aliases.value': 1 }, {  name: 'Aliases' })

