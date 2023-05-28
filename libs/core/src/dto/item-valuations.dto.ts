import { Valuations } from '@app/mongo';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_VALUATIONS, SWAGGER_VALUATIONS_EVALUATIONS } from '@app/core';

export class ItemValuationsDto {
  @ApiProperty(SWAGGER_VALUATIONS_EVALUATIONS)
  readonly is_evaluating: number;

  @ApiProperty(SWAGGER_VALUATIONS)
  readonly valuations: Array<Valuations>[];
}
