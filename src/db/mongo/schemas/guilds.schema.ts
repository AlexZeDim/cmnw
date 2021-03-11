import {prop, modelOptions} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'guilds' }, options: { customName: 'guilds' } })

export class Guild {
  @prop({ lowercase: true })
  public _id!: string;
}
