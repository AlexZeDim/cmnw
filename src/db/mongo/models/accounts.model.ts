import {prop, getModelForClass, modelOptions, index} from '@typegoose/typegoose';

export enum AliasKey {
  Discord = "discord",
  Bnet = "battle.tag",
  Twitter = "twitter",
  Name = "name",
  Character = "character",
  Nickname = "nickname",
  Codename = "codename",
}

@modelOptions({ schemaOptions: { timestamps: true, collection: 'accounts' }, options: { customName: 'accounts' } })
@index({ 'aliases.key': 1, 'aliases.value': 1 }, {  name: 'Aliases' })

class Alias {
  @prop({ enum: AliasKey })
  public key!: AliasKey
  @prop()
  public value!: string
}

class Account {
  @prop({ required: true, default: 'Anonymous' })
  public cryptonym!: string;
  @prop()
  public tags?: string[];
  @prop({ _id: false })
  public alias?: Alias[]
}

export const AccountModel = getModelForClass(Account);
