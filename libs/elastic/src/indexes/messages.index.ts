import { IsArray, IsNumberString, IsOptional, IsString } from 'class-validator';
import { SOURCE_TYPE } from '@app/core';

export class MessagesIndex {
  @IsString()
  @IsOptional()
  snowflake: string;

  @IsString()
  @IsOptional()
  source_type: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  discord_author?: string;

  @IsNumberString()
  @IsOptional()
  discord_author_snowflake?: string;

  @IsString()
  @IsOptional()
  discord_server?: string;

  @IsNumberString()
  @IsOptional()
  discord_server_snowflake?: string;

  @IsString()
  @IsOptional()
  discord_channel?: string;

  @IsNumberString()
  @IsOptional()
  discord_channel_snowflake?: string;

  @IsArray()
  tags: string[];

  @IsArray()
  clearance: string[];

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  text: string;

  @IsString()
  @IsOptional()
  discord_text?: string;

  constructor(data: MessagesIndex) {
    Object.assign(this, data);
  };

  static createFromModel(model: MessagesIndex) {
    return new MessagesIndex({
      snowflake: model.snowflake,
      source_type: model.source_type ? model.source_type : SOURCE_TYPE.DiscordText,
      author: model.author,
      discord_author: model.discord_author,
      discord_author_snowflake: model.discord_author_snowflake,
      discord_server: model.discord_server,
      discord_server_snowflake: model.discord_server_snowflake,
      discord_channel: model.discord_channel,
      discord_channel_snowflake: model.discord_channel_snowflake,
      tags: model.tags || [],
      clearance: model.clearance || [],
      subject: model.subject,
      text: model.text,
      discord_text: model.discord_text,
    });
  }
}
