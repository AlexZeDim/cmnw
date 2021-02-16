import {prop, getModelForClass, modelOptions} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'realms' }, options: { customName: 'realms' } })

class Realm {
  @prop({ lowercase: true })
  public _id!: string;
}

export const RealmModel = getModelForClass(Realm);
