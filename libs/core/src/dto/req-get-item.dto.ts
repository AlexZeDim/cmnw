import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_ITEM_ID } from '@app/core';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReqGetItemDto {
  @ApiProperty(SWAGGER_ITEM_ID)
  @IsNotEmpty({ message: 'ID is required' })
  @IsString()
  @Transform(({ value: id }) => id.toLowerCase())
  readonly id: string;
}
