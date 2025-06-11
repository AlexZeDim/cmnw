import { IOrderQuotes, SWAGGER_ITEM_QUOTES } from '@app/resources';
import { ApiProperty } from '@nestjs/swagger';

export class ItemQuotesDto {
  @ApiProperty(SWAGGER_ITEM_QUOTES)
    quotes: IOrderQuotes[];
}
