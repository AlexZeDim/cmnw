import { Document } from 'mongoose';
import { Prop, SchemaFactory } from '@nestjs/mongoose';

export class WarcraftLogs extends Document {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Boolean, default: false, required: true })
  status: boolean;
}

export const WarcraftLogsSchema = SchemaFactory.createForClass(WarcraftLogs);
