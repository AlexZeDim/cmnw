import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ALIAS_KEY } from '@app/core';

@Schema()
class Alias extends Document {
  @Prop()
  _id: string;

  @Prop({ type: String, enum: ALIAS_KEY })
  type: string;
}

export const AliasSchema = SchemaFactory.createForClass(Alias);

@Schema({ timestamps: true })
export class Account extends Document {
  @Prop({ type: String, required: true, default: 'Anonymous' })
  cryptonym: string;

  @Prop({ type: String })
  tags: string[];

  @Prop({ type: [AliasSchema] })
  alias: Types.Array<Alias>
}

export const AccountsSchema = SchemaFactory.createForClass(Account);
AccountsSchema.index({ 'aliases.key': 1, 'aliases.value': 1 }, {  name: 'Aliases' })

