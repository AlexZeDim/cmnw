import { IsBoolean, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { CHANNEL_TYPE } from '@app/elastic';

export class ChannelsIndex {
  @IsString()
  snowflake: string;

  @IsString()
  name: string;

  @IsString()
  server_id: string;

  @IsString()
  @IsOptional()
  parent_id?: string;

  @IsEnum(CHANNEL_TYPE)
  channel_type: CHANNEL_TYPE;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  scanned_by?: string;

  @IsDate()
  @IsOptional()
  protected created_at?: Date = new Date();

  constructor(data: ChannelsIndex) {
    Object.assign(this, data);
  };

  static createFromModel(model: ChannelsIndex) {
    return new ChannelsIndex({
      snowflake: model.snowflake,
      name: model.name,
      server_id: model.server_id,
      parent_id: model.parent_id,
      channel_type: model.channel_type ? model.channel_type : CHANNEL_TYPE.UNKNOWN,
      is_active: model.is_active === true,
      scanned_by: model.scanned_by,
    });
  }
}
