import {
  FACTION,
  SWAGGER_CHARACTER_REALMS_ID,
  SWAGGER_HEROIC_LOGS,
  SWAGGER_MYTHIC_LOGS,
} from '@app/core';
import { IsArray, IsNumberString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  SWAGGER_CHARACTER_AVG_ILVL,
  SWAGGER_CHARACTER_DAYS_FROM,
  SWAGGER_CHARACTER_DAYS_TO,
  SWAGGER_CHARACTER_FACTION,
  SWAGGER_CHARACTER_LANGUAGES,
  SWAGGER_CHARACTER_RIO,
} from '@app/core';

export class CharactersLfgDto {
  @ApiProperty(SWAGGER_CHARACTER_REALMS_ID)
  @IsOptional()
  @IsArray()
  @Transform(({ value: realmsId }) =>
    Array.isArray(realmsId) && realmsId
      ? realmsId.map((realmId) => Number(realmId))
      : [realmsId],
  )
  readonly realmsId: number[];

  @ApiProperty(SWAGGER_CHARACTER_LANGUAGES)
  @IsOptional()
  @IsArray()
  @Transform(({ value: languages }) =>
    Array.isArray(languages) && languages
      ? languages.map((l) => l.toLowerCase())
      : [languages],
  )
  readonly languages: string[];

  @ApiProperty(SWAGGER_CHARACTER_FACTION)
  @IsOptional()
  readonly faction: FACTION;

  @ApiProperty(SWAGGER_CHARACTER_AVG_ILVL)
  @IsOptional()
  @IsNumberString()
  readonly averageItemLevel: number;

  @ApiProperty(SWAGGER_CHARACTER_RIO)
  @IsOptional()
  @IsNumberString()
  readonly raiderIoScore: number;

  @ApiProperty(SWAGGER_CHARACTER_DAYS_FROM)
  @IsOptional()
  @IsNumberString()
  readonly daysFrom: number;

  @ApiProperty(SWAGGER_CHARACTER_DAYS_TO)
  @IsOptional()
  @IsNumberString()
  readonly daysTo: number;

  @ApiProperty(SWAGGER_MYTHIC_LOGS)
  @IsOptional()
  @IsNumberString()
  readonly mythicLogs: number;

  @ApiProperty(SWAGGER_HEROIC_LOGS)
  @IsOptional()
  @IsNumberString()
  readonly heroicLogs: number;
}
