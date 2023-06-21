import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { dynamicParams } from '@app/e2e/params/';
import { commonwealthConfig } from '@app/configuration';

@Injectable()
export class TestDma {
  private readonly logger = new Logger(TestDma.name, { timestamp: true });

  private BNet: BlizzAPI = new BlizzAPI({
    region: 'eu',
    clientId: commonwealthConfig.clientId,
    clientSecret: commonwealthConfig.clientSecret,
  });

  async commodity(): Promise<any> {
    return this.BNet.query('/data/wow/auctions/commodities', dynamicParams);
  }
}
