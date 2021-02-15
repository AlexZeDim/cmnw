import {prop, getModelForClass, modelOptions} from '@typegoose/typegoose';

@modelOptions({ options: { customName: 'characters' } })

class Character {
  @prop({ lowercase: true })
  public _id!: string;
}

export const CharacterModel = getModelForClass(Character);
