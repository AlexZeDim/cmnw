import { ApiProperty } from '@nestjs/swagger';
import {
  SWAGGER_REALM_CONNECTED_REALM_ID,
  SWAGGER_REALM_ID,
  SWAGGER_REALM_NAME,
  SWAGGER_REALM_REGION,
  SWAGGER_REALM_SLUG,
} from '@app/core/swagger/osint.swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { capitalize } from '@app/core/utils';

export class RealmDto {
  @IsNumber()
  @ApiProperty(SWAGGER_REALM_ID)
  readonly id: number;

  @ApiProperty(SWAGGER_REALM_REGION)
  @IsString()
  @Transform(({ value: region }) => capitalize(region))
  readonly region: string;

  @ApiProperty(SWAGGER_REALM_SLUG)
  @IsString()
  @Transform(({ value: slug }) => slug.toLowerCase())
  readonly slug: string;

  @IsString()
  @ApiProperty(SWAGGER_REALM_NAME)
  readonly name: string;

  @IsNumber()
  @ApiProperty(SWAGGER_REALM_CONNECTED_REALM_ID)
  readonly connected_realm_id: number;
}
