import { Controller, Get, HttpCode, HttpStatus, Logger, Param, Req } from '@nestjs/common';
import { DmaService } from './dma.service';

@Controller('dma')
export class DmaController {
  private readonly logger = new Logger(
    DmaController.name, true,
  );

  constructor(
    private readonly dmaService: DmaService
  ) {}

  @HttpCode(HttpStatus.OK)
  @Get('/item/:id')
  getItem(@Param('id') id: string): string {
    // TODO validate
    const [item, realm] = id.split('@');
    return this.dmaService.getItem(item, realm);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/token/:region/:limit')
  getWowToken(@Param('region') region: string, @Param('limit') limit: number): string {
    return this.dmaService.getWowToken(region, limit);
  }
}
