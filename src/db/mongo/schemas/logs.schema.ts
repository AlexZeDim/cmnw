import {prop, modelOptions} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'logs' }, options: { customName: 'logs' } })

export class Log {
  @prop({ required: true, lowercase: true, index: true })
  public root_id!: string;
  @prop({ required: true, type: String, default: [] })
  public root_history!: string[];
  @prop({ required: true })
  public original!: string;
  @prop({ required: true })
  public updated!: string;
  @prop({ required: true })
  public event!: string;
  @prop({ required: true })
  public action!: string;
  @prop({ required: true })
  public t0!: Date;
  @prop({ required: true })
  public t1!: Date;
}
