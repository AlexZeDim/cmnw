import { SOURCE_TYPE } from '@app/core';
import { IsArray, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class MessagesMapping {
  @IsEnum(SOURCE_TYPE)
  message_type: SOURCE_TYPE;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  discord_author?: string;

  @IsNumberString()
  @IsOptional()
  discord_author_id?: string;

  @IsString()
  @IsOptional()
  discord_server?: string;

  @IsNumberString()
  @IsOptional()
  discord_server_id?: string;

  @IsString()
  @IsOptional()
  discord_channel?: string;

  @IsNumberString()
  @IsOptional()
  discord_channel_id?: string;

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

  constructor(data: MessagesMapping) {
    Object.assign(this, data);
  }

  static createFromModel(model: MessagesMapping) {
    return new MessagesMapping({
      message_type: model.message_type ? model.message_type : SOURCE_TYPE.DiscordText,
      author: model.author,
      discord_author: model.discord_author,
      discord_author_id: model.discord_author_id,
      discord_server: model.discord_server,
      discord_server_id: model.discord_server_id,
      discord_channel: model.discord_channel,
      discord_channel_id: model.discord_channel_id,
      tags: model.tags || [],
      clearance: model.clearance || [],
      subject: model.subject,
      text: model.text,
      discord_text: model.discord_text,
    });
  }
}
