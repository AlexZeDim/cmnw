import {prop, modelOptions} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'wowtoken' }, options: { customName: 'wowtoken' } })

export class Token {
  @prop({ required: true })
  public _id!: number;
  @prop({ required: true })
  public region!: string;
  @prop({ required: true })
  public price!: number;
  @prop({ required: true })
  public last_modified!: number;
}
