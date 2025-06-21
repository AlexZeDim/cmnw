import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { difference, union } from 'lodash';
import { In, Repository } from 'typeorm';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import * as cheerio from 'cheerio/dist/browser';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CharacterJobQueue,
  charactersQueue, delay,
  findRealm,
  getKeys, getRandomElement,
  GLOBAL_OSINT_KEY,
  ICharacterQueueWP,
  LFG_STATUS,
  OSINT_LFG_WOW_PROGRESS, OSINT_SOURCE, ProfileJobQueue, profileQueue, toSlug,
} from '@app/resources';

@Injectable()
export class WowProgressLfgService {
  private readonly logger = new Logger(WowProgressLfgService.name);

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectQueue(profileQueue.name)
    private readonly queueProfile: Queue<ProfileJobQueue, number>,
    @InjectQueue(charactersQueue.name)
    private readonly queueCharacters: Queue<CharacterJobQueue, number>,
  ) {

  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexWowProgressLfg(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    const logTag = this.indexWowProgressLfg.name;
    try {
      this.logger.log('————————————————————————————————————');
      /**
       * Revoke characters status from old NOW => to PREV
       */
      await delay(60);
      const charactersLfgRemoveOld = await this.charactersProfileRepository.update(
        {
          lfgStatus: LFG_STATUS.OLD,
        },
        {
          lfgStatus: null,
        },
      );
      this.logger.log(
        `${charactersLfgRemoveOld.affected} characters removed from LFG-${LFG_STATUS.OLD}`,
      );

      const [nowUpdatedResult, newUpdatedResult] = await Promise.all([
        this.charactersProfileRepository.update(
          {
            lfgStatus: LFG_STATUS.NOW,
          },
          {
            lfgStatus: LFG_STATUS.OLD,
          },
        ),
        this.charactersProfileRepository.update(
          {
            lfgStatus: LFG_STATUS.NEW,
          },
          {
            lfgStatus: LFG_STATUS.OLD,
          },
        ),
      ]);

      this.logger.debug(
        `characters status revoked from NOW ${nowUpdatedResult.affected} | NEW ${newUpdatedResult.affected}`,
      );

      const keysEntity = await getKeys(this.keysRepository, clearance);
      const [firstPageUrl, secondPageUrl] = OSINT_LFG_WOW_PROGRESS;

      const [firstPage, secondPage] = await Promise.all([
        await this.getWowProgressLfg(firstPageUrl),
        await this.getWowProgressLfg(secondPageUrl),
      ]);

      const isCharacterPageValid = Boolean(firstPage.size && secondPage.size);
      if (!isCharacterPageValid) {
        this.logger.debug(
          `LFG page ${firstPage.size} & ${secondPage.size} | return`,
        );
        return;
      }

      const charactersLfg = new Map([...firstPage, ...secondPage]);
      const charactersLfgNow = union(
        Array.from(firstPage.keys()),
        Array.from(secondPage.keys()),
      );
      /**
       * @description If LFG.OLD not found then write NOW to PREV
       * @description Overwrite LFG status NOW
       */
      this.logger.log(
        `${charactersLfgNow.length} characters found in LFG-${LFG_STATUS.NOW}`,
      );
      const characterProfileLfgOld = await this.charactersProfileRepository.findBy({
        lfgStatus: LFG_STATUS.OLD,
      });
      this.logger.log(
        `${characterProfileLfgOld.length} characters found for LFG-${LFG_STATUS.OLD}`,
      );

      const charactersLfgOld = characterProfileLfgOld.map(
        (character) => character.guid,
      );

      const charactersDiffNew = difference(charactersLfgNow, charactersLfgOld);
      const charactersDiffNow = difference(charactersLfgNow, charactersDiffNew);
      const isLfgNewExists = charactersDiffNew.length;

      await this.charactersProfileRepository.update(
        {
          guid: In(charactersDiffNow),
        },
        {
          lfgStatus: LFG_STATUS.NOW,
        },
      );

      this.logger.log(
        `${isLfgNewExists} characters added to queue with LFG-${LFG_STATUS.NOW}`,
      );

      if (!isLfgNewExists) return;

      const realmsEntity = new Map<string, RealmsEntity>([]);

      const isLfgOldExists = Boolean(characterProfileLfgOld.length);

      const lookingForGuild = isLfgOldExists ? LFG_STATUS.NEW : LFG_STATUS.NOW;

      await lastValueFrom(
        from(charactersDiffNew).pipe(
          mergeMap(async (characterGuid) =>
            this.pushCharacterAndProfileToQueue(
              characterGuid,
              charactersLfg,
              realmsEntity,
              keysEntity,
              lookingForGuild
            )
          ),
        ),
      );
      this.logger.log('————————————————————————————————————');
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: logTag,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  private async pushCharacterAndProfileToQueue(
    characterGuid: string,
    charactersLfg: Map<string, ICharacterQueueWP>,
    realmsEntity: Map<string, RealmsEntity>,
    keysEntity: KeysEntity[],
    lookingForGuild: LFG_STATUS
  ): Promise<void> {
    const logTag = this.pushCharacterAndProfileToQueue.name;

    try {
      const characterQueue = charactersLfg.get(characterGuid);
      const isRealmInStore = realmsEntity.has(characterQueue.realm);

      const realmEntity = isRealmInStore
        ? realmsEntity.get(characterQueue.realm)
        : await findRealm(this.realmsRepository, characterQueue.realm);

      if (!realmEntity) {
        this.logger.warn(`Realm: ${characterQueue.realm} not found`);
        return;
      }

      if (!isRealmInStore) realmsEntity.set(characterQueue.realm, realmEntity);

      const key = getRandomElement(keysEntity);

      await Promise.allSettled([
        this.queueProfile.add(characterQueue.guid, {
          guid: characterQueue.guid,
          name: characterQueue.name,
          realm: realmEntity.slug,
          lookingForGuild,
          updateRIO: true,
          updateWCL: true,
          updateWP: true,
        }),
        await this.queueCharacters.add(
          characterQueue.guid,
          {
            guid: characterQueue.guid,
            name: characterQueue.name,
            realm: realmEntity.slug,
            realmId: realmEntity.id,
            realmName: realmEntity.name,
            region: 'eu',
            clientId: key.client,
            clientSecret: key.secret,
            accessToken: key.token,
            createdBy: OSINT_SOURCE.WOW_PROGRESS_LFG,
            updatedBy: OSINT_SOURCE.WOW_PROGRESS_LFG,
            createOnlyUnique: false,
            forceUpdate: 1000 * 60 * 30,
          },
          {
            jobId: characterQueue.guid,
            priority: 2,
          },
        ),
      ]);

      this.logger.log(
        `${logTag}: Added to character queue: ${characterQueue.guid}`,
      );
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: logTag,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  private async getWowProgressLfg(url: string) {
    const wpCharactersQueue = new Map<string, ICharacterQueueWP>([]);
    const logTag = this.getWowProgressLfg.name;
    try {
      const response = await this.httpService.axiosRef.get(url);

      const wowProgressHTML = cheerio.load(response.data);
      const listingLookingForGuild = wowProgressHTML.html('table.rating tbody tr');

      await Promise.allSettled(
        wowProgressHTML(listingLookingForGuild).map(async (x, node) => {
          const tableRowElement = wowProgressHTML(node).find('td');
          const [preName, preGuild, preRaid, preRealm, preItemLevel, preTimestamp] =
            tableRowElement;

          const name = wowProgressHTML(preName).text().trim();
          const guild = wowProgressHTML(preGuild).text();
          const raid = wowProgressHTML(preRaid).text();
          const [, rawRealm] = wowProgressHTML(preRealm).text().split('-');
          const itemLevel = wowProgressHTML(preItemLevel).text();
          const timestamp = wowProgressHTML(preTimestamp).text();

          const realm = rawRealm.trim();
          const isCharacterValid = Boolean(name && realm);
          if (!isCharacterValid) return;

          const guid = toSlug(`${name}@${realm}`);

          wpCharactersQueue.set(guid, {
            guid,
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
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: logTag,
          error: JSON.stringify(errorOrException),
        }
      );
      return wpCharactersQueue;
    }
  }
}
