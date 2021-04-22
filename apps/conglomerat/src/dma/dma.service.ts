import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DmaService {
  private readonly logger = new Logger(
    DmaService.name, true,
  );

  constructor(

  ) { }

  getItem(item: string, realm: string): string {
    // TODO add new dma to queue
    return `${item}@${realm}`
  }

  getWowToken(region: string, limit: number): string {
    return `${region}@${limit}`
  }
}
