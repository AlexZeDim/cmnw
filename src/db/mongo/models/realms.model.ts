import {prop, getModelForClass, modelOptions} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'realms' }, options: { customName: 'realms' } })

class Realm {
  @prop()
  public _id!: number;
  @prop()
  public slug!: string;
  @prop()
  public name!: string;
  @prop()
  public name_locale?: string;
  @prop()
  public ticker?: string;
  @prop()
  public wcl_id?: number;
}

export const RealmModel = getModelForClass(Realm);
