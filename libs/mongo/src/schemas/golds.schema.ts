import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FACTION } from '@app/core';
import { Realm } from '@app/mongo/schemas/realms.schema';

@Schema({ timestamps: true })
export class Gold extends Document {
  @Prop({ required: true, type: Number, ref: 'Realm' })
    connected_realm_id: number | Realm;

  @Prop({ required: true, enum: FACTION, type: String })
    faction: string;

  @Prop({ type: String })
    owner: string;

  @Prop({ type: String })
    status: string;

  @Prop({ type: Number, required: true })
    quantity: number;

  @Prop({ type: Number, required: true })
    price: number;

  @Prop({ type: Number, required: true })
    last_modified: number;

  @Prop({ type: Date })
    updatedAt: Date;

  @Prop({ type: Date })
    createdAt: Date;
}

export const GoldsSchema = SchemaFactory.createForClass(Gold);
GoldsSchema.index({ createdAt: -1 }, { name: 'TTL', expireAfterSeconds: 86400 });
GoldsSchema.index({ status: 1, connected_realm_id: 1, last_modified: -1 }, { name: 'Q' });
