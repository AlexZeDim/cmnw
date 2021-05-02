import { Controller, Get, HttpCode, HttpStatus, Logger, Param, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { DmaService } from './dma.service';

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
  @HttpCode(HttpStatus.OK)
  @Get('/item/:id')
  getItem(@Param('id') id: string): string {
    // TODO validate
    const [item, realm] = id.split('@');
    return this.dmaService.getItem(item, realm);
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

  @ApiOperation({ description: 'Returns requested item' })
  @ApiOkResponse({ description: 'Request item with selected _id' })
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

}
