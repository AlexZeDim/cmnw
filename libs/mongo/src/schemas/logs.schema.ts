import { Document } from "mongoose";
import { Prop, SchemaFactory } from '@nestjs/mongoose';

export class Log {
  @Prop({ required: true, lowercase: true, index: true })
  root_id: string;
  
  @Prop({ required: true, default: [] })
  root_history: string[];
  
  @Prop({ required: true })
  original: string;
  
  @Prop({ required: true })
  updated: string;
  
  @Prop({ required: true })
  event: string;
  
  @Prop({ required: true })
  action: string;
  
  @Prop({ required: true })
  t0: Date;
  
  @Prop({ required: true })
  t1: Date;
}

export const LogsSchema = SchemaFactory.createForClass(Log);