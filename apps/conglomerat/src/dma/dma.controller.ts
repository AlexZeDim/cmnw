import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DmaService } from './dma.service';
import { LeanDocument } from 'mongoose'
import { Item, Token } from '@app/mongo';
import {
  ItemChartDto,
  ItemCrossRealmDto,
  ItemFeedDto,
  ItemQuotesDto,
  ItemValuationsDto, ReqGetItemDto,
  WowtokenDto,
} from '@app/core';

@ApiTags('dma')
@Controller('dma')
export class DmaController {

  constructor(
    private readonly dmaService: DmaService
  ) {}

  @ApiOperation({ description: 'Returns requested item' })
  @ApiOkResponse({ description: 'Request item with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/item')
  async getItem(@Query() input: ItemCrossRealmDto): Promise<LeanDocument<Item>> {
    return await this.dmaService.getItem(input);
  }


  @ApiOperation({ description: 'Returns requested WoWToken' })
  @ApiOkResponse({ description: 'Request item with selected timestamp' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/token')
  async getWowToken(@Query() input: WowtokenDto): Promise<LeanDocument<Token>[]> {
    return await this.dmaService.getWowToken(input);
  }

  @ApiOperation({ description: 'Returns requested item valuations' })
  @ApiOkResponse({ description: 'Request item valuations  with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/item/valuations')
  getItemValuations(@Query() input: ItemCrossRealmDto): Promise<ItemValuationsDto> {
    return this.dmaService.getItemValuations(input);
  }

  @ApiOperation({ description: 'Returns requested commdty item chart' })
  @ApiOkResponse({ description: 'Request commdty chart with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/commdty/chart')
  async getCommdtyChart(@Query() input: ReqGetItemDto): Promise<ItemChartDto> {
    return await this.dmaService.getCommdtyChart(input);
  }

  @ApiOperation({ description: 'Returns requested gold chart' })
  @ApiOkResponse({ description: 'Request gold chart with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/gold/chart')
  async getGoldChart(@Query() input: ReqGetItemDto): Promise<ItemChartDto> {
    return await this.dmaService.getGoldChart(input);
  }

  @ApiOperation({ description: 'Returns requested item quotes' })
  @ApiOkResponse({ description: 'Request item quotes with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/item/quotes')
  async getAssetQuotes(@Query() input: ItemCrossRealmDto): Promise<ItemQuotesDto> {
    return await this.dmaService.getAssetQuotes(input);
  }

  @ApiOperation({ description: 'Returns requested item feed' })
  @ApiOkResponse({ description: 'Request item feed with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/item/feed')
  async getItemFeed(@Query() input: ItemCrossRealmDto): Promise<ItemFeedDto> {
    return await this.dmaService.getItemFeed(input);
  }
}
