import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AliasKey } from '@app/core';

@Schema()
class Alias {
  @Prop()
  key: AliasKey;

  @Prop()
  value: string;
}

@Schema()
export class Account extends Document {
  @Prop({ required: true, default: 'Anonymous' })
  cryptonym: string;

  @Prop({ type: String })
  tags: string[];

  @Prop({ _id: false })
  alias: Alias[]
}

export const AccountsSchema = SchemaFactory.createForClass(Account);
AccountsSchema.index({ 'aliases.key': 1, 'aliases.value': 1 }, {  name: 'Aliases' })

