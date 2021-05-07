import { FACTION } from '@app/core';
import { IsArray, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  SWAGGER_CHARACTER_AVGILVL,
  SWAGGER_CHARACTER_DAYS_FROM,
  SWAGGER_CHARACTER_DAYS_TO,
  SWAGGER_CHARACTER_FACTION,
  SWAGGER_CHARACTER_LANGUAGES,
  SWAGGER_CHARACTER_REALMS,
  SWAGGER_CHARACTER_RIO,
  SWAGGER_CHARACTER_WCL,
} from '@app/core/swagger/osint.swagger';

export class CharactersLfgDto {
  @ApiProperty(SWAGGER_CHARACTER_REALMS)
  @IsOptional()
  @IsArray()
  @Transform(({ value: realms }) => realms.map((r) => r.toLowerCase()))
  readonly realms: string[];

  @ApiProperty(SWAGGER_CHARACTER_LANGUAGES)
  @IsOptional()
  @IsArray()
  @Transform(({ value: languages }) => languages.map((l) => l.toLowerCase()))
  readonly languages: string[];

  @ApiProperty(SWAGGER_CHARACTER_FACTION)
  @IsOptional()
  @IsEnum(FACTION)
  readonly faction: FACTION;

  @ApiProperty(SWAGGER_CHARACTER_AVGILVL)
  @IsOptional()
  @IsNumber()
    readonly average_item_level: number;

  @ApiProperty(SWAGGER_CHARACTER_RIO)
  @IsOptional()
  @IsNumber()
  readonly rio_score: number;

  @ApiProperty(SWAGGER_CHARACTER_DAYS_FROM)
  @IsOptional()
  @IsNumber()
  readonly days_from: number;

  @ApiProperty(SWAGGER_CHARACTER_DAYS_TO)
  @IsOptional()
  @IsNumber()
  readonly days_to: number;

  @ApiProperty(SWAGGER_CHARACTER_WCL)
  @IsOptional()
  @IsNumber()
  readonly wcl_percentile: number;
}
