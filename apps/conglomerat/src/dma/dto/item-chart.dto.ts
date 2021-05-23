import { ApiProperty } from '@nestjs/swagger';
import {
  ChartOrderInterface,
  SWAGGER_ITEM_CHART_DATASET,
  SWAGGER_ITEM_CHART_X_AXIS,
  SWAGGER_ITEM_CHART_Y_AXIS,
} from '@app/core';

export class ItemChartDto {
  @ApiProperty(SWAGGER_ITEM_CHART_Y_AXIS)
  readonly yAxis: number[];

  @ApiProperty(SWAGGER_ITEM_CHART_X_AXIS)
  readonly xAxis: (string | number | Date)[];

  @ApiProperty(SWAGGER_ITEM_CHART_DATASET)
  readonly dataset: ChartOrderInterface[];
}
