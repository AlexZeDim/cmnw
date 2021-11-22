import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ENTITY_NAME } from '@app/core';
import { Document, Types, SchemaTypes } from 'mongoose';
import { Account, Character, Guild, Item, Realm } from '@app/mongo';

@Schema()
export class Entity extends Document {
  @Prop({ type: String, enum: ENTITY_NAME, default: ENTITY_NAME.Entity })
  entity: string;

  @Prop({ type: String, index: true })
  name: string;

  @Prop({ type: [String] })
  languages: string[];

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Account' })
  account_id: Types.ObjectId | Account;

  @Prop({ type: Number, ref: 'Item' })
  item_id: number | Item;

  @Prop({ type: Number, ref: 'Realm' })
  realm_id: number | Realm;

  @Prop({ type: String, ref: 'Character' })
  character_id: string | Character;

  @Prop({ type: String, ref: 'Guild' })
  guild_id: string | Guild;
}

export const EntitySchema = SchemaFactory.createForClass(Entity);
