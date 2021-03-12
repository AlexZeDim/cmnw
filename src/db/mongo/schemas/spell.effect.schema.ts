import {prop, modelOptions} from '@typegoose/typegoose';

/**
 *  TODO description
 *  Effect - effect flag
 *  EffectItemType - item_id
 *  EffectBasePointsF - item_quantity
 *  spellID - spell_id
 */

@modelOptions({ schemaOptions: { timestamps: false, collection: 'skill_effect' }, options: { customName: 'skill_effect' } })

export class SpellEffect {
  @prop({ required: true })
  public _id!: number;
  @prop({ required: true })
  public effect!: number;
  @prop({ required: true, index: true })
  public item_id!: number;
  @prop({ required: true })
  public item_quantity!: number;
  @prop({ required: true, index: true })
  public spell_id!: number;
}
