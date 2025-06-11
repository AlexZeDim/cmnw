import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_ITEM_FEED } from '@app/resources';
import { MarketEntity } from '@app/pg';

export class ItemFeedDto {
  @ApiProperty(SWAGGER_ITEM_FEED)
  readonly feed: MarketEntity[];
}
