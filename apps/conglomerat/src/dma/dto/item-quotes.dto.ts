import { OrderQuotesInterface, SWAGGER_ITEM_QUOTES } from '@app/core';
import { ApiProperty } from '@nestjs/swagger';

export class ItemQuotesDto {
  @ApiProperty(SWAGGER_ITEM_QUOTES)
  quotes: OrderQuotesInterface[]
}
