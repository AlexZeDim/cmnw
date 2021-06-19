import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Account extends Document {
  @Prop({ type: String, required: true, default: 'Anonymous', index: true })
  cryptonym: string;

  @Prop({ type: String })
  tags: string[];

  @Prop({ type: String, index: true })
  discord_id: string[];

  @Prop({ type: String, index: true })
  battle_tag: string[];

  @Prop({ type: String })
  characters_id: string[];
}

export const AccountsSchema = SchemaFactory.createForClass(Account);
AccountsSchema.index({ discord: 1, battlenet: 1 }, {  name: 'Aliases' })

