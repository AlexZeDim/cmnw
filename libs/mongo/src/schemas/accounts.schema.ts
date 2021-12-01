import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Snowflake } from 'discord.js';

@Schema({ timestamps: true })
export class Account extends Document {
  @Prop({ type: String, default: 'Anonymous' })
  nickname: string;

  @Prop({ type: String, default: 'Anonymous' })
  cryptonym: string;

  /**
   * Channel with file or management
   */
  @Prop({ type: String })
  oraculum_id: Snowflake;

  @Prop({ type: String })
  discord_id: Snowflake;

  @Prop({ type: String })
  battle_tag: string;

  @Prop({ type: [String] })
  characters_id: string[];

  @Prop({ type: [String] })
  clearance: string[];

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ type: Boolean, default: false, index: true })
  is_index: boolean;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export const AccountsSchema = SchemaFactory.createForClass(Account);
AccountsSchema.index(
  {
    discord_id: 1,
    battle_tag: 1,
    nickname: 1,
    cryptonym: 1,
    tags: 1
  },
  { name: 'Aliases' }
)

