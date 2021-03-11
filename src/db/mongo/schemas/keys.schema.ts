import {prop, modelOptions} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'keys' }, options: { customName: 'keys' } })

export class Key {
  @prop()
  public _id!: string;
  @prop({required: true})
  public secret!: string;
  @prop()
  public token?: string;
  @prop()
  public expired_in?: number;
  @prop({ type: () => [String] })
  public tags!: string[];
}
