import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { commonwealthConfig } from '@app/configuration';
import { API_HEADERS_ENUM, apiConstParams } from '@app/core';

@Injectable()
export class TestDma {
  private readonly logger = new Logger(TestDma.name, { timestamp: true });

  private BNet: BlizzAPI = new BlizzAPI({
    region: 'eu',
    clientId: commonwealthConfig.clientId,
    clientSecret: commonwealthConfig.clientSecret,
  });

  async commodity(): Promise<any> {
    return this.BNet.query(
      '/data/wow/auctions/commodities',
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }

  async auctions(connectedRealmId: number): Promise<any> {
    return this.BNet.query(
      `/data/wow/connected-realm/${connectedRealmId}/auctions`,
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }
}
