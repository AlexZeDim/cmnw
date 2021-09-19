import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { AtSignExists, SWAGGER_ITEM_CROSS_REALM } from '@app/core';
import { Transform } from 'class-transformer';

export class ItemCrossRealmDto {
  @ApiProperty(SWAGGER_ITEM_CROSS_REALM)
  @IsNotEmpty({ message: '_id is required' })
  @IsString()
  @Validate(AtSignExists)
  @Transform(({ value: _id }) => _id.toLowerCase())
  readonly _id: string;
}
