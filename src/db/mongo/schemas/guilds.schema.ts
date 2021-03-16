import {prop, modelOptions, mongoose} from '@typegoose/typegoose';
import {toSlug} from "../refs";

@modelOptions({ schemaOptions: { timestamps: true, collection: 'guilds' }, options: { customName: 'guilds' } })

class GuildMember {
  @prop({ required: true, lowercase: true, set: (val: string) => toSlug(val), get: (val: string) => toSlug(val) })
  public _id!: string;
  @prop({ required: true })
  public id!: number;
  @prop({ required: true })
  public rank!: number;
}

export class Guild {
  @prop({ required: true, lowercase: true })
  public _id!: string;
  @prop()
  public id?: number;
  @prop({ required: true })
  public name!: string;
  @prop({ required: true, set: (val: string) => toSlug(val), get: (val: string) => toSlug(val) })
  public realm!: string;
  @prop({ required: true })
  public realm_id!: number;
  @prop({ required: true })
  public realm_name!: string;
  @prop({ required: true })
  public faction!: string;
  @prop({ required: true, default: [] })
  public members!: mongoose.Types.Array<GuildMember>
  @prop()
  public achievement_points?: number;
  @prop()
  public member_count?: number;
  @prop({ default: Date.now() })
  public last_modified?: Date;
  @prop()
  public created_timestamp?: Date;
  @prop()
  public status_code?: number;
  @prop()
  public created_by?: string;
  @prop()
  public updatedBy?: string;
  @prop()
  public updatedAt!: Date;
  @prop()
  public createdAt!: Date;
}
