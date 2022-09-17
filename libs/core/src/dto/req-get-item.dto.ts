import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_ITEM_ID } from '@app/core';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReqGetItemDto {
  @ApiProperty(SWAGGER_ITEM_ID)
  @IsNotEmpty({ message: '_id is required' })
  @IsString()
  @Transform(({ value: _id }) => _id.toLowerCase())
  readonly _id: string;
}
