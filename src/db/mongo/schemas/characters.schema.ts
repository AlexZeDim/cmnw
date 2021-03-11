import {modelOptions, prop, Severity} from '@typegoose/typegoose';
import {capitalize, toSlug} from '../refs'

@modelOptions({ schemaOptions: { timestamps: true, collection: 'characters'}, options: { customName: 'characters', allowMixed: Severity.ALLOW } })

/**
 * _id and id field represents Blizzard GUID name@realm-id
 * https://wow.gamepedia.com/GUID
 */

class Mount {
  @prop()
  public _id!: number;
  @prop()
  public name?: string;
}

class Pet {
  @prop()
  public _id!: number;
  @prop()
  public name?: string;
}

class Profession {
  @prop()
  public name?: string;
  @prop()
  public tier?: string;
  @prop()
  public id?: number;
  @prop()
  public skill_points?: number;
  @prop()
  public max_skill_points?: number;
  @prop()
  public specialization?: string;
}

class LookingForGroup {
  @prop({ index: true })
  public status!: boolean;
  @prop()
  public new?: boolean;
  @prop()
  public battle_tag?: string;
  @prop()
  public rio?: number;
  @prop()
  public days_from?: number;
  @prop()
  public days_to?: number;
  @prop()
  public wcl_percentile?: number;
  @prop({ type: Object })
  public progress?: object;
  @prop()
  public role?: string;
  @prop()
  public transfer?: boolean;
  @prop({ type: String })
  public languages?: string[];
}

export class Character {
  @prop({ required: true, lowercase: true })
  public _id!: string;
  @prop()
  public id?: number;
  @prop({ index: true, set: (val: string) => capitalize(val), get: (val: string) => capitalize(val) })
  public name!: string;
  @prop({ required: true })
  public realm_id!: number;
  @prop({ required: true })
  public realm_name!: string;
  @prop({ required: true, set: (val: string) => toSlug(val), get: (val: string) => toSlug(val) })
  public realm!: string;
  @prop()
  public guild?: string;
  @prop({ lowercase: true, index: true })
  public guild_id?: string;
  @prop()
  public guild_guid?: number;
  @prop()
  public guild_rank?: number;
  @prop()
  public hash_a?: string;
  @prop()
  public hash_b?: string;
  @prop()
  public hash_f?: string;
  @prop()
  public hash_t?: string;
  @prop()
  public race?: string;
  @prop()
  public character_class?: string;
  @prop()
  public active_spec?: string;
  @prop()
  public gender?: string;
  @prop()
  public faction?: string;
  @prop()
  public level?: number;
  @prop()
  public achievement_points?: number;
  @prop()
  public status_code?: number;
  @prop()
  public average_item_level?: number;
  @prop()
  public equipped_item_level?: number;
  @prop()
  public chosen_covenant?: string;
  @prop()
  public renown_level?: number;
  @prop({ default: Date.now() })
  public last_modified?: Date;
  @prop()
  public created_by?: string;
  @prop()
  public updated_by?: string;
  @prop()
  public avatar?: string;
  @prop()
  public inset?: string;
  @prop()
  public main?: string;
  @prop()
  public personality?: string;
  @prop({ type: Mount })
  public mounts?: Mount[];
  @prop({ type: Pet })
  public pets?: Pet[];
  @prop({ type: Profession, _id: false })
  public professions?: Profession[];
  @prop({ type: LookingForGroup })
  public lfg?: LookingForGroup;
  @prop()
  public updatedAt!: Date;
  @prop()
  public createdAt!: Date;
}
