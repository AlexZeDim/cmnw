import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { ArrayContains, In, LessThan, Not, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { from, lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { pipeline } from 'node:stream/promises';
import {
  FACTION,
  findRealm,
  ICharacterQueueWP,
  IGold,
  MARKET_TYPE,
  OSINT_LFG_WOW_PROGRESS,
  OSINT_SOURCE,
  OSINT_SOURCE_WOW_PROGRESS,
  toSlug,
  VALUATION_TYPE,
} from '@app/core';
import { mergeMap } from 'rxjs/operators';
import cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';
import ms from 'ms';

@Injectable()
export class TestsBench implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestsBench.name, { timestamp: true });

  constructor(
    private httpService: HttpService,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(ItemsEntity)
    private readonly itemsRepository: Repository<ItemsEntity>,
  ) {}

  async onApplicationBootstrap() {
    await this.getLfgWowProgress();
  }

  async getUniqueRealms() {
    const offsetTime = DateTime.now().minus({ minutes: 30 }).toMillis();
    console.log(offsetTime);
    const realmsEntity = await this.realmsRepository
      .createQueryBuilder('realms')
      .where({ auctionsTimestamp: LessThan(offsetTime) })
      .distinctOn(['realms.connectedRealmId'])
      .getMany();

    console.log(realmsEntity, realmsEntity.length);
  }

  async getGold() {
    const response = await this.httpService.axiosRef.get<string>(
      'https://funpay.ru/chips/2/',
    );

    const exchangeListingPage = cheerio.load(response.data);
    const goldListingMarkup = exchangeListingPage.html('a.tc-item');

    const goldOrders: Array<Partial<IGold>> = [];
    const marketOrders: Array<MarketEntity> = [];
    const realmsEntity = new Map<string, RealmsEntity>([]);
    const timestamp = new Date().getTime();

    exchangeListingPage(goldListingMarkup).each((index, element) => {
      const orderId = exchangeListingPage(element).attr('href');
      const realm = exchangeListingPage(element).find('.tc-server').text();
      const faction = exchangeListingPage(element).find('.tc-side').text();
      const status = Boolean(exchangeListingPage(element).attr('data-online'));
      const quantity = exchangeListingPage(element).find('.tc-amount').text();
      const owner = exchangeListingPage(element).find('.media-user-name').text();
      const price = exchangeListingPage(element).find('.tc-price div').text();
      goldOrders.push({ orderId, realm, faction, status, quantity, owner, price });
    });

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

            const [url, orderId] = order.orderId.split('=');
            const price = parseFloat(order.price.replace(/ ₽/g, ''));
            const quantity = parseInt(order.quantity.replace(/\s/g, ''));
            const counterparty = order.owner.replace('\n', '').trim();
            const isQuantityLimit = quantity > 15_000_000 && price;
            if (isQuantityLimit) {
              this.logger.log(quantity);
              return;
            }

            let faction: FACTION = FACTION.ANY;
            const isOnline = order.status;
            const isHorde = [FACTION.H, 'Орда'].includes(order.faction);
            const isAlliance = [FACTION.A, 'Альянсa', 'Альянс'].includes(
              order.faction,
            );

            if (isAlliance) faction = FACTION.A;
            if (isHorde) faction = FACTION.H;

            const marketEntity = this.marketRepository.create({
              connectedRealmId,
              itemId: 1,
              type: MARKET_TYPE.G,
              orderId,
              faction,
              quantity,
              isOnline,
              counterparty,
              price,
              timestamp,
            });

            marketOrders.push(marketEntity);
          } catch (error) {
            this.logger.error(`indexGold: error ${error}`);
          }
        }, 5),
      ),
    );

    await this.marketRepository.save(marketOrders);
  }

  async getWowProgress() {
    const response = await this.httpService.axiosRef.get(OSINT_SOURCE_WOW_PROGRESS);

    const dirPath = path.join(__dirname, '..', '..', 'files', 'wowprogress');
    await fs.ensureDir(dirPath);

    const page = cheerio.load(response.data);
    const wpPage = page.html('body > pre:nth-child(3) > a');

    await Promise.allSettled(
      page(wpPage).map(async (x, node) => {
        const isAttributes = 'attribs' in node && node.attribs.href.includes('eu_');
        if (!isAttributes) return;

        const url = node.attribs.href;
        console.log(url);

        const downloadLink = encodeURI(decodeURI(OSINT_SOURCE_WOW_PROGRESS + url));
        const fileName = decodeURIComponent(url.substr(url.lastIndexOf('/') + 1));
        const realmMatch = fileName.match(/(?<=_)(.*?)(?=_)/g);
        const isMatchExists = realmMatch && realmMatch.length;

        if (!isMatchExists) return;

        const [realmSlug] = realmMatch;

        const realmEntity = await findRealm(this.realmsRepository, realmSlug);

        if (!realmEntity) return;

        const realmGuildsZip = await this.httpService.axiosRef.request({
          url: downloadLink,
          responseType: 'stream',
        });

        const filePath = `${dirPath}/${fileName}`;
        console.log(filePath);

        await pipeline(realmGuildsZip.data, fs.createWriteStream(filePath));
      }),
    );

    return await fs.readdir(dirPath);
  }

  async getLfgWowProgress() {
    try {
      const wpCharactersQueue = new Map<string, ICharacterQueueWP>([]);
      const response = await this.httpService.axiosRef.get(
        OSINT_LFG_WOW_PROGRESS[0],
      );

      const wowProgressHTML = cheerio.load(response.data);
      const listingLookingForGuild = wowProgressHTML.html('table.rating tbody tr');

      await Promise.allSettled(
        wowProgressHTML(listingLookingForGuild).map(async (x, node) => {
          const tableRowElement = wowProgressHTML(node).find('td');
          const [preName, preGuild, preRaid, preRealm, preItemLevel, preTimestamp] =
            tableRowElement;

          const name = wowProgressHTML(preName).text();
          const guild = wowProgressHTML(preGuild).text();
          const raid = wowProgressHTML(preRaid).text();
          const realm = wowProgressHTML(preRealm).text();
          const itemLevel = wowProgressHTML(preItemLevel).text();
          const timestamp = wowProgressHTML(preTimestamp).text();

          const isCharacterValid = Boolean(name && realm);
          if (!isCharacterValid) return;

          const preGuid = `${name}@${realm}`;

          wpCharactersQueue.set(preGuid, {
            name,
            guild,
            raid,
            realm,
            itemLevel,
            timestamp,
          });
        }),
      );

      return wpCharactersQueue;
    } catch (e) {
      this.logger.error(e);
    }
  }

  async unpackWowProgress(files: string[]) {
    const dirPath = path.join(__dirname, '..', '..', 'files', 'wowprogress');

    await lastValueFrom(
      from(files).pipe(
        mergeMap(async (file) => {
          try {
            const isNotGzip = !file.match(/gz$/g);
            if (isNotGzip) {
              throw new UnsupportedMediaTypeException(`file ${file} is not gz`);
            }

            const realmMatch = file.match(/(?<=_)(.*?)(?=_)/g);
            const isMatchExists = realmMatch && realmMatch.length;
            if (!isMatchExists) {
              throw new NotFoundException(`file ${file} doesn't have a realm`);
            }

            const [realmSlug] = realmMatch;

            const realmEntity = await findRealm(this.realmsRepository, realmSlug);

            if (!realmEntity) {
              throw new NotFoundException(`realm ${realmSlug} not found!`);
            }

            const buffer = await fs.readFile(`${dirPath}/${file}`);
            const data = zlib
              .unzipSync(buffer, { finishFlush: zlib.constants.Z_SYNC_FLUSH })
              .toString();

            // TODO interface type
            const json = JSON.parse(data);
            const isJsonValid = json && Array.isArray(json) && json.length;

            if (!isJsonValid) {
              throw new UnsupportedMediaTypeException(`json not valid`);
            }

            for (const guild of json) {
              const isGuildValid = guild.name && !guild.name.includes('[Raid]');
              if (!isGuildValid) {
                this.logger.log(
                  `indexWowProgress: guild ${guild.name} have negative [Raid] pattern, skipping...`,
                );
                continue;
              }

              const guid: string = toSlug(`${guild.name}@${realmEntity.slug}`);

              console.log(guid);
            }
          } catch (error) {
            this.logger.warn(`indexWowProgress: ${error}`);
          }
        }, 1),
      ),
    );
  }

  async testWarcraftLogRealms(warcraftLogsId: number) {
    const response = await this.httpService.axiosRef.get<string>(
      `https://www.warcraftlogs.com/server/id/${warcraftLogsId}`,
    );
    const wclHTML = cheerio.load(response.data);
    console.log(wclHTML);
    const serverElement = wclHTML.html('.server-name');
    console.log(serverElement);
    const realmName = wclHTML(serverElement).text();
    console.log(realmName);

    const realmEntity = await findRealm(this.realmsRepository, realmName);
    console.log(realmEntity);
  }

  async testAssetClassFromMarket() {
    const t = await this.itemsRepository.find({
      where: {
        id: In([1, 2]),
        assetClass: Not(ArrayContains([VALUATION_TYPE.ITEM])),
      },
    });
    console.log(t);
  }
}
