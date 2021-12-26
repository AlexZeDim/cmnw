import { SUBJECT_VECTOR } from '@app/core';
import { IsArray, IsEnum, IsString, IsDate, IsOptional, IsBoolean } from 'class-validator';

export class ServersIndex {
  @IsString()
  snowflake: string;

  @IsString()
  name: string;

  @IsEnum(SUBJECT_VECTOR)
  vector: SUBJECT_VECTOR;

  @IsArray()
  tags: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  scanned_by?: string;

  @IsDate()
  @IsOptional()
  protected created_at?: Date = new Date();

  constructor(data: ServersIndex) {
    Object.assign(this, data);
  };

  static createFromModel(model: ServersIndex) {
    return new ServersIndex({
      snowflake: model.snowflake,
      name: model.name,
      vector: model.vector ? model.vector : SUBJECT_VECTOR.COMMON,
      tags: model.tags || [],
      is_active: model.is_active === true,
      scanned_by: model.scanned_by,
    });
  }
}
