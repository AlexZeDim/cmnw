import {prop, modelOptions, mongoose} from '@typegoose/typegoose';

/**
 *  TODO description
 *  Effect - effect flag
 *  EffectItemType - item_id
 *  EffectBasePointsF - item_quantity
 *  spellID - spell_id
 */

@modelOptions({ schemaOptions: { timestamps: false, collection: 'spell_reagents' }, options: { customName: 'spell_reagents' } })

class Item {
  @prop({ required: true })
  public _id!: number;
  @prop({ required: true })
  public quantity!: number;
}

export class SpellReagents {
  @prop({ required: true })
  public _id!: number;
  @prop({ required: true, index: true })
  public spell_id!: number;
  @prop({ required: true, default: [], type: Item })
  public reagents!: mongoose.Types.Array<Item>;
}
