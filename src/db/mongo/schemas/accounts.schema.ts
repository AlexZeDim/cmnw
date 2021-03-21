import {prop, modelOptions, index} from '@typegoose/typegoose';
import { AliasKey } from "../../../interface/constant";

class Alias {
  @prop({ enum: AliasKey })
  public key!: AliasKey
  @prop()
  public value!: string
}

@modelOptions({ schemaOptions: { timestamps: true, collection: 'accounts' }, options: { customName: 'accounts', allowMixed: 0 } })
@index({ 'aliases.key': 1, 'aliases.value': 1 }, {  name: 'Aliases' })

export class Account {
  @prop({ required: true, default: 'Anonymous' })
  public cryptonym!: string;
  @prop({ type: String })
  public tags?: string[];
  @prop({ _id: false, type: Alias })
  public alias?: Alias[]
}
