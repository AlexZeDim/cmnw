import {prop, getModelForClass, modelOptions} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'realms' }, options: { customName: 'realms' } })

class Realm {
  @prop()
  public _id!: number;
  @prop()
  public slug!: string;
  @prop()
  public name!: string;
}

export const RealmModel = getModelForClass(Realm);
