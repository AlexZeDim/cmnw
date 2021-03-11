import {prop, modelOptions} from '@typegoose/typegoose';
import {toSlug} from '../refs';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'logs' }, options: { customName: 'logs' } })

export class Log {
  @prop({ lowercase: true, index: true, set: (val: string) => toSlug(val), get: (val: string) => toSlug(val) })
  public root_id!: string;
  @prop({ type: () => [String] })
  public root_history!: string[];
  @prop()
  public original!: string;
  @prop()
  public updated!: string;
  @prop()
  public event!: string;
  @prop()
  public action!: string;
  @prop()
  public t0!: Date;
  @prop()
  public t1!: Date;
}
