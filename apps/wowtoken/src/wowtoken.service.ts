import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, MarketEntity } from '@app/pg';
import { Repository } from 'typeorm';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  BlizzardApiWowToken,
  getKey,
  GLOBAL_DMA_KEY,
  isWowToken,
  MARKET_TYPE,
  toGold,
  TOLERANCE_ENUM,
} from '@app/core';

@Injectable()
export class WowtokenService {
  private readonly logger = new Logger(WowtokenService.name, {
    timestamp: true,
  });

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexTokens(clearance: string = GLOBAL_DMA_KEY): Promise<void> {
    try {
      const key = await getKey(this.keysRepository, clearance);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      // TODO it is capable to implement if-modified-since header
      const response = await this.BNet.query<BlizzardApiWowToken>(
        '/data/wow/token/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC, TOLERANCE_ENUM.DMA),
      );

      const isWowTokenValid = isWowToken(response);
      if (!isWowTokenValid) {
        this.logger.error(`${WowtokenService.name}: response not valid`);
        return;
      }

      const { price, lastModified, last_updated_timestamp: timestamp } = response;

      const isWowTokenExists = await this.marketRepository.exist({
        where: {
          timestamp: timestamp,
          itemId: 1,
          connectedRealmId: 1,
          type: MARKET_TYPE.T,
        },
      });

      if (isWowTokenExists) {
        this.logger.debug(
          `${WowtokenService.name}: Token exists on timestamp ${timestamp} | ${lastModified}`,
        );
        return;
      }

      const wowTokenEntity = this.marketRepository.create({
        orderId: `${timestamp}`,
        price: toGold(price),
        itemId: 122284,
        quantity: 1,
        connectedRealmId: 1,
        type: MARKET_TYPE.T,
        timestamp,
      });

      await this.marketRepository.save(wowTokenEntity);
    } catch (errorException) {
      this.logger.error(`${WowtokenService.name}: ${errorException}`);
    }
  }
}
