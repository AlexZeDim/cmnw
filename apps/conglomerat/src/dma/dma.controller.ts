import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
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
import { ItemCrossRealmDto } from './dto';

@ApiTags('dma')
@Controller('dma')
export class DmaController {
  private readonly logger = new Logger(
    DmaController.name, true,
  );

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
  @Get('/item/:id')
  getItem(@Query() input: ItemCrossRealmDto): string {
    return this.dmaService.getItem(input);
  }

  @ApiOperation({ description: 'Returns requested WoWToken' })
  @ApiOkResponse({ description: 'Request item with selected timestamp' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/token/:region/:limit')
  getWowToken(@Param('region') region: string, @Param('limit') limit: number): string {
    return this.dmaService.getWowToken(region, limit);
  }

  @ApiOperation({ description: 'Returns requested item valuations' })
  @ApiOkResponse({ description: 'Request item valuations  with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item/:id')
  getItemValuations(@Param('id') id: string): string {
    // TODO validate
    const [item, realm] = id.split('@');
    return this.dmaService.getItemValuations(item, realm);
  }

  @ApiOperation({ description: 'Returns requested item chart' })
  @ApiOkResponse({ description: 'Request item chart with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item/:id')
  getItemChart(@Param('id') id: string): string {
    // TODO validate
    const [item, realm] = id.split('@');
    return this.dmaService.getItemChart(item, realm);
  }

  @ApiOperation({ description: 'Returns requested item quotes' })
  @ApiOkResponse({ description: 'Request item quotes with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item/:id')
  getItemQuotes(@Param('id') id: string): string {
    // TODO validate
    const [item, realm] = id.split('@');
    return this.dmaService.getItemQuotes(item, realm);
  }

  @ApiOperation({ description: 'Returns requested item feed' })
  @ApiOkResponse({ description: 'Request item feed with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/item/:id')
  getItemFeed(@Param('id') id: string): string {
    // TODO validate
    const [item, realm] = id.split('@');
    return this.dmaService.getItemFeed(item, realm);
  }

}
