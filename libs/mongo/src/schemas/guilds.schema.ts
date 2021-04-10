import { Document } from "mongoose";
import { Prop, SchemaFactory } from '@nestjs/mongoose';

class GuildMember {
  @Prop({ required: true, lowercase: true })
  _id: string;
  
  @Prop({ required: true })
  id: number;
  
  @Prop({ required: true })
  rank: number;
}


export class Guild {
  @Prop({ required: true, lowercase: true })
  _id: string;
  
  @Prop()
  id: number;
  
  @Prop({ required: true })
  name: string;
  
  @Prop({ required: true })
  realm: string;
  
  @Prop({ required: true })
  realm_id: number;
  
  @Prop({ required: true })
  realm_name: string;
  
  @Prop({ required: true })
  faction: string;
  
  @Prop({ required: true, default: [] })
  members: mongoose.Types.Array<GuildMember>
  
  @Prop()
  achievement_points: number;
  
  @Prop()
  member_count: number;
  
  @Prop({ default: Date.now() })
  last_modified: Date;
  
  @Prop()
  created_timestamp: Date;
  
  @Prop()
  status_code: number;
  
  @Prop()
  created_by: string;
  
  @Prop()
  updated_by: string;
  
  @Prop()
  updatedAt: Date;
  
  @Prop()
  createdAt: Date;
}

export const GuildsSchema = SchemaFactory.createForClass(Guild);