import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { dynamicParams, profileParams } from '@app/e2e';

@Injectable()
export class TestDma {
  private readonly logger = new Logger(
    TestDma.name, { timestamp: true },
  );

  private BNet: BlizzAPI = new BlizzAPI({
    region: 'eu',
    clientId: '',
    clientSecret: '',
    accessToken: ''
  })

  async commodity() {
    return await this.BNet.query(`/data/wow/auctions/commodities`, dynamicParams);
  }
}
