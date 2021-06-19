import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EntityName } from '@app/core';
import { Document } from "mongoose";

@Schema()
export class Entity extends Document {
  @Prop({ type: String })
  parentId: string;

  @Prop({ type: String, enum: EntityName })
  entityName: string;

  @Prop({ type: String })
  optionName: string;

  @Prop({ type: [String] })
  languages: string[];

  @Prop({ type: [String] })
  texts: string[];
}

export const EntitySchema = SchemaFactory.createForClass(Entity);
