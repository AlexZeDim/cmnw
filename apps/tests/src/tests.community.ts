import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { commonwealthConfig } from '@app/configuration';
import { IWarcraftLogsConfig } from '@app/core';
import cheerio from 'cheerio';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class TestsCommunity {
  private readonly logger = new Logger(TestsCommunity.name, { timestamp: true });

  constructor(private httpService: HttpService) {}

  /**
   * @description get Warcraft Logs Report IDs by page
   */
  async getLogsFromPage(
    config: IWarcraftLogsConfig,
    realmId = 1,
    page = 1,
  ): Promise<Array<string>> {
    try {
      const warcraftLogsURI = 'https://www.warcraftlogs.com/zone/reports';

      const response = await this.httpService.axiosRef.get(
        `${warcraftLogsURI}?zone=${config.raidTier}&server=${realmId}&page=${page}`,
      );

      const wclHTML = cheerio.load(response.data);
      const wclLogsUnique = new Set<string>();
      const wclTable = wclHTML.html('td.description-cell > a');

      wclHTML(wclTable).each((_x, node) => {
        const hrefString = wclHTML(node).attr('href');
        const isReports = hrefString.includes('reports');
        if (isReports) {
          const [link]: string[] = hrefString.match(/(.{16})\s*$/g);
          wclLogsUnique.add(link);
        }
      });

      return Array.from(wclLogsUnique);
    } catch (errorOrException) {
      this.logger.error(`indexLogs: ${errorOrException}`);
    }
  }
}
