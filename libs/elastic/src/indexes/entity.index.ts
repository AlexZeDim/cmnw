import { ENTITY_NAME } from '@app/core';
import { IsArray, IsEnum, IsString } from 'class-validator';

export class EntityIndex {
  @IsEnum(ENTITY_NAME)
  ner_tag: ENTITY_NAME;

  @IsString()
  name: string;

  @IsArray()
  languages: string[];

  @IsArray()
  tags: string[];

  constructor(data: EntityIndex) {
    Object.assign(this, data);
  }

  static createFromModel(model: EntityIndex) {
    return new EntityIndex({
      ner_tag: model.ner_tag,
      name: model.name,
      languages: model.languages,
      tags: model.tags,
    });
  }
}
