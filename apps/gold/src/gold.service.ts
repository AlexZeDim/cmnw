import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';
import { MarketEntity, RealmsEntity } from '@app/pg';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateTime } from 'luxon';
import * as cheerio from 'cheerio';
import {
  DMA_SOURCE_GOLD,
  FACTION,
  findRealm, GOLD_ITEM_ENTITY,
  IGold,
  isGold,
  MARKET_TYPE,
  round,
} from '@app/core';

@Injectable()
export class GoldService {
  private readonly logger = new Logger(GoldService.name, { timestamp: true });

  constructor(
    private httpService: HttpService,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  private async indexGold(): Promise<void> {
    try {
      const response = await this.httpService.axiosRef.get<string>(DMA_SOURCE_GOLD);

      const exchangeListingPage = cheerio.load(response.data);
      const goldListingMarkup = exchangeListingPage.html('a.tc-item');

      const goldOrders: Array<Partial<IGold>> = [];
      const marketOrders: Array<MarketEntity> = [];
      const realmsEntity = new Map<string, RealmsEntity>([]);
      const connectedRealmIds = new Set<number>();
      const timestamp = DateTime.now().toMillis();

      await Promise.allSettled(
        exchangeListingPage(goldListingMarkup).map((index, element) => {
          const orderId = exchangeListingPage(element).attr('href');
          const realm = exchangeListingPage(element).find('.tc-server').text();
          const faction = exchangeListingPage(element).find('.tc-side').text();
          const status = Boolean(exchangeListingPage(element).attr('data-online'));
          const quantity = exchangeListingPage(element).find('.tc-amount').text();
          const owner = exchangeListingPage(element).find('.media-user-name').text();
          const price = exchangeListingPage(element).find('.tc-price div').text();
          goldOrders.push({
            realm,
            faction,
            status,
            quantity,
            owner,
            price,
            orderId,
          });
        }),
      );

      await lastValueFrom(
        from(goldOrders).pipe(
          mergeMap(async (order) => {
            try {
              const realmEntity = realmsEntity.has(order.realm)
                ? realmsEntity.get(order.realm)
                : await findRealm(this.realmsRepository, order.realm);

              const connectedRealmId =
                !realmEntity && order.realm === 'Любой'
                  ? 1
                  : realmEntity
                  ? realmEntity.connectedRealmId
                  : 0;

              const isValid = Boolean(
                connectedRealmId && order.price && order.quantity,
              );
              if (!isValid) {
                this.logger.log(order.realm);
                return;
              }

              realmsEntity.set(order.realm, realmEntity);
              connectedRealmIds.add(realmEntity.connectedRealmId);

              const [url, orderId] = order.orderId.split('=') || null;
              const price = parseFloat(order.price.replace(/ ₽/g, ''));
              const quantity = parseInt(order.quantity.replace(/\s/g, ''));
              const counterparty = order.owner.replace('\n', '').trim();

              const isGoldValid = isGold({
                orderId,
                price,
                quantity,
                counterparty,
              });

              if (!isGoldValid) return;
              const value = round(price * (quantity / 1000), 2);

              const isQuantityLimit = quantity > 100_000_000;
              if (isQuantityLimit) return;

              let faction = FACTION.ANY;

              const isOnline = order.status;
              const isHorde = [FACTION.H, 'Орда'].includes(order.faction);
              const isAlliance = [FACTION.A, 'Альянсa', 'Альянс'].includes(
                order.faction,
              );

              if (isAlliance) faction = FACTION.A;
              if (isHorde) faction = FACTION.H;

              const marketEntity = this.marketRepository.create({
                connectedRealmId,
                itemId: GOLD_ITEM_ENTITY.id,
                type: MARKET_TYPE.G,
                orderId,
                faction,
                value,
                quantity,
                isOnline,
                counterparty,
                price,
                timestamp,
              });

              marketOrders.push(marketEntity);
            } catch (error) {
              this.logger.error(`indexGold ${error}`);
            }
          }, 5),
        ),
      );

      const ordersCount = marketOrders.length;
      this.logger.log(
        `indexGold: ${marketOrders.length} orders on timestamp: ${timestamp} successfully inserted`,
      );

      if (!ordersCount) return;

      await this.marketRepository.save(marketOrders);
      await this.realmsRepository.update({}, { goldTimestamp: timestamp });
    } catch (errorOrException) {
      this.logger.error(`indexGold ${errorOrException}`);
    }
  }
}
