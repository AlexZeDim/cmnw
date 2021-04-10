import { Document } from "mongoose";
import { Prop, SchemaFactory } from '@nestjs/mongoose';

class Alias {
  @Prop() //AliasKey
  key: AliasKey;

  @Prop()
  value: string;
}

export class Account {
  @Prop({ required: true, default: 'Anonymous' })
  cryptonym: string;

  @Prop({ type: String })
  tags: string[];
  
  @Prop({ _id: false })
  alias: Alias[]
}

export const AccountsSchema = SchemaFactory.createForClass(Account);
AccountsSchema.index({ 'aliases.key': 1, 'aliases.value': 1 }, {  name: 'Aliases' })

