import { Injectable, Logger } from '@nestjs/common';
import { cmnwConfig } from '@app/configuration';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { API_HEADERS_ENUM, apiConstParams, TOLERANCE_ENUM } from '@app/core';

@Injectable()
export class TestsDma {
  private readonly logger = new Logger(TestsDma.name, { timestamp: true });

  private BNet: BlizzAPI = new BlizzAPI({
    region: 'eu',
    clientId: cmnwConfig.clientId,
    clientSecret: cmnwConfig.clientSecret,
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

  async wowToken(): Promise<any> {
    return this.BNet.query(
      '/data/wow/token/index',
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }

  async item(itemId: number): Promise<any> {
    return this.BNet.query(
      `/data/wow/item/${itemId}`,
      apiConstParams(API_HEADERS_ENUM.STATIC, TOLERANCE_ENUM.DMA),
    );
  }

  async itemMedia(itemId: number): Promise<any> {
    return this.BNet.query(
      `/data/wow/media/item/${itemId}`,
      apiConstParams(API_HEADERS_ENUM.STATIC, TOLERANCE_ENUM.DMA),
    );
  }
}
