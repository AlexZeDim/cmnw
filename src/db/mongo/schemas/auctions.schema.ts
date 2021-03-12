import {prop, modelOptions, index} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true, collection: 'auctions' }, options: { customName: 'auctions', allowMixed: 0 } })
@index({ 'createdAt': -1 }, { name: 'TTL', expireAfterSeconds: 86400 })
@index({ 'connected_realm_id': 1, 'last_modified': -1 }, { name: 'TS' })
@index({ 'item_id': -1, 'connected_realm_id': 1 }, { name: 'Q' })
@index({ 'last_modified': -1, 'item_id': -1, 'connected_realm_id': 1 }, { name: 'PL' })

export class Auction {
  @prop({ required: true })
  public id!: number;
  @prop({ required: true })
  public item_id!: number;
  @prop()
  public item?: any;
  @prop({ required: true })
  public connected_realm_id!: number;
  @prop({ required: true })
  public last_modified!: number;
  @prop()
  public quantity!: number;
  @prop()
  public bid?: number;
  @prop()
  public buyout?: number;
  @prop()
  public price?: number;
  @prop()
  public time_left?: string;
}

//TODO review req for index
