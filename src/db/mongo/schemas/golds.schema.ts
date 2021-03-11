import {prop, modelOptions, index} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'golds' }, options: { customName: 'golds' } })
@index({ createdAt: -1 }, { name: 'TTL', expireAfterSeconds: 86400 })
@index({ status: 1, connected_realm_id: 1, last_modified: -1 }, { name: 'Q' })

export class Gold {
  @prop({ required: true })
  connected_realm_id!: number;
  @prop()
  faction?: string;
  @prop()
  owner?: string;
  @prop()
  status?: string;
  @prop({ required: true })
  quantity!: number;
  @prop({ required: true })
  price!: number;
  @prop({ required: true })
  last_modified!: number;
}
