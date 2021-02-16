import {prop, getModelForClass, modelOptions} from '@typegoose/typegoose';
import {fromSlug, toSlug} from '../refs'

@modelOptions({ schemaOptions: { timestamps: true, collection: 'characters'}, options: { customName: 'characters' } })

/**
 * _id and id field represents Blizzard GUID name@realm-id
 * https://wow.gamepedia.com/GUID
 */

class Realm {
  @prop({ required: true })
  public _id!: number;
  @prop({ required: true })
  public name!: string;
  @prop({ required: true, set: (val: string) => toSlug(val) })
  public slug!: string;
}

class Guild {
  @prop({ required: true, lowercase: true, index: true })
  public _id!: string;
  @prop({ required: true })
  public id!: number;
  @prop({ required: true })
  public name!: string;
  @prop()
  public rank?: number;
}

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

//TODO add media

class Character {
  @prop({ required: true, lowercase: true })
  public _id!: string;
  @prop()
  public id?: number;
  @prop({ index: true, set: (val: string) => fromSlug(val) })
  public name!: string;
  @prop({ required: true})
  public realm!: Realm;
  @prop()
  public guild?: Guild;
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
  public personality?: string;
  @prop({ type: [Mount] })
  public mounts?: Mount;
  @prop({ type: [Pet] })
  public pets?: Pet;
  @prop({ type: Profession, _id: false })
  public professions?: Profession[];
  @prop({ type: LookingForGroup })
  public lfg?: LookingForGroup
}

export const CharacterModel = getModelForClass(Character);
