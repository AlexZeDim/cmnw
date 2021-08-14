import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ENTITY_NAME } from '@app/core';
import { Document } from "mongoose";

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
}

export const EntitySchema = SchemaFactory.createForClass(Entity);
