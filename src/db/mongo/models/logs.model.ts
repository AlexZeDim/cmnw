import {prop, getModelForClass, modelOptions} from '@typegoose/typegoose';
import {toSlug} from '../refs';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'logs' }, options: { customName: 'logs' } })

class Log {
  @prop({ lowercase: true, index: true, set: (val: string) => toSlug(val), get: (val: string) => toSlug(val) })
  public root_id!: string;
  @prop({ type: () => [String] })
  public root_history!: string[];
  @prop()
  public t1?: string;
  @prop()
  public t0?: string;
  @prop()
  public action?: string;
  @prop()
  public before?: Date;
  @prop()
  public after?: Date;
}

//export const LogModel = getModelForClass(Log);
