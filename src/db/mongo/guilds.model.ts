import {prop, getModelForClass, modelOptions} from '@typegoose/typegoose';

@modelOptions({ options: { customName: 'guilds' } })

class Guild {
  @prop({ lowercase: true })
  public _id!: string;
}

export const GuildModel = getModelForClass(Guild);
