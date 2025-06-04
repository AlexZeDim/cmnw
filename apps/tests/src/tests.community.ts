import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { get } from 'lodash';
import cheerio from 'cheerio';

import {
  isCharacterRaidLogResponse,
  IWarcraftLogsConfig,
  RaidCharacter,
  toGuid,
} from '@app/core';

@Injectable()
export class TestsCommunity {
  private readonly logger = new Logger(TestsCommunity.name, {
    timestamp: true,
  });

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

      const response = await this.httpService.axiosRef.get<string>(
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

  async getCharactersFromLogs(token: string, logId: string) {
    const response = await this.httpService.axiosRef.request({
      method: 'post',
      url: 'https://www.warcraftlogs.com/api/v2/client',
      headers: { Authorization: `Bearer ${token}` },
      data: {
        query: `
          query {
            reportData {
              report (code: "${logId}") {
                startTime
                rankedCharacters {
                  id
                  name
                  guildRank
                  server {
                    id
                    name
                    normalizedName
                    slug
                  }
                }
                masterData {
                  actors {
                    type
                    name
                    server
                  }
                }
              }
            }
          }`,
      },
    });
    const isGuard = isCharacterRaidLogResponse(response);
    if (!isGuard) return [];
    /**
     * @description Take both characters ranked & playable
     */
    const timestamp = get(response, 'data.data.reportData.report.startTime', 1);
    const rankedCharacters: Array<RaidCharacter> = get(
      response,
      'data.data.reportData.report.rankedCharacters',
      [],
    ).map((character) => ({
      guid: toGuid(character.name, character.server.slug),
      id: character.id,
      name: character.name,
      realmName: character.server.name,
      realm: character.server.slug,
      guildRank: character.guildRank,
      timestamp: timestamp,
    }));

    const playableCharacters: Array<RaidCharacter> = get(
      response,
      'data.data.reportData.report.masterData.actors',
      [],
    )
      .filter((character) => character.type === 'Player')
      .map((character) => ({
        guid: toGuid(character.name, character.server),
        name: character.name,
        realmName: character.server,
        timestamp: timestamp,
      }));

    const raidCharacters = [...rankedCharacters, ...playableCharacters];
    const characters = new Map<string, RaidCharacter>();

    for (const character of raidCharacters) {
      const isIn = characters.has(character.guid);
      if (isIn) continue;
      characters.set(character.guid, character);
    }

    return Array.from(characters.values());
  }
}
