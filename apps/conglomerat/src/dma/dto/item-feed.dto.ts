import { Auction } from '@app/mongo';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_ITEM_FEED } from '@app/core';

export class ItemFeedDto {
  @ApiProperty(SWAGGER_ITEM_FEED)
  readonly feed: Auction[]
}
