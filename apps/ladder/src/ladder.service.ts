import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { Queue } from 'bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import ms from 'ms';
import Redis from 'ioredis';
import {
  BadGatewayException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import {
  BRACKETS,
  charactersQueue,
  delay,
  FACTION,
  GLOBAL_OSINT_KEY,
  CharacterJobQueue,
  MYTHIC_PLUS_SEASONS,
  OSINT_SOURCE,
  getKeys,
  apiConstParams,
  API_HEADERS_ENUM,
  toGuid,
} from '@app/resources';

@Injectable()
export class LadderService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LadderService.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectQueue(charactersQueue.name)
    private readonly queueCharacters: Queue<CharacterJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // await this.indexHallOfFame(GLOBAL_OSINT_KEY, false);
    await this.indexMythicPlusLadder(GLOBAL_OSINT_KEY, false);
    await this.indexPvPLadder(GLOBAL_OSINT_KEY, false);
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async indexPvPLadder(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast = true,
  ): Promise<void> {
    try {
      const keys = await getKeys(this.keysRepository, clearance, true, false);
      const [key] = keys;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const r = await this.BNet.query<any>(
        '/data/wow/pvp-season/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC),
      );

      for (const season of r.seasons) {
        const isOnlyLast =
          onlyLast && season.id !== r.seasons[r.seasons.length - 1].id;
        if (isOnlyLast) continue;

        for (const bracket of BRACKETS) {
          await delay(2);

          const rr = await this.BNet.query<any>(
            `/data/wow/pvp-season/${season.id}/pvp-leaderboard/${bracket}`,
            apiConstParams(API_HEADERS_ENUM.DYNAMIC),
          );

          console.log(rr);

          const characterJobs = rr.entries.map((player) => ({
            name: toGuid(player.character.name, player.character.realm.slug),
            data: {
              guid: toGuid(player.character.name, player.character.realm.slug),
              name: player.character.name,
              realm: player.character.realm.slug,
              forceUpdate: ms('4h'),
              region: 'eu',
              createdBy: OSINT_SOURCE.PVP_LADDER,
              updatedBy: OSINT_SOURCE.PVP_LADDER,
              faction: player.faction.type === 'HORDE' ? FACTION.H : FACTION.A,
              iteration: player.rank,
              createOnlyUnique: false,
            },
            opts: {
              jobId: toGuid(player.character.name, player.character.realm.slug),
              priority: 2,
            },
          }));

          // await this.queueCharacters.addBulk(characterJobs);

          this.logger.log(
            `indexPvPLadder: Season ${season.id} | Bracket ${bracket} | Players: ${characterJobs.length}`,
          );
        }
      }
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: 'indexPvPLadder',
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  async indexMythicPlusLadder(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast = true,
  ): Promise<void> {
    try {
      const keys = await getKeys(this.keysRepository, clearance, true);
      const [key] = keys;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      const mythicPlusDungeons: Map<number, string> = new Map([]);
      const mythicPlusSeasons: Set<number> = new Set();
      const mythicPlusExpansionWeeks: Set<number> = new Set();

      const { dungeons } = await this.BNet.query<any>(
        '/data/wow/mythic-keystone/dungeon/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC),
      );

      const { seasons } = await this.BNet.query<any>(
        '/data/wow/mythic-keystone/season/index',
        apiConstParams(API_HEADERS_ENUM.DYNAMIC),
      );

      dungeons.map((dungeon) =>
        mythicPlusDungeons.set(dungeon.id, dungeon.name.en_GB),
      );
      seasons.map((season) => mythicPlusSeasons.add(season.id));

      const lastSeason = Array.from(mythicPlusSeasons).pop();

      for (const mythicPlusSeason of mythicPlusSeasons.values()) {
        if (mythicPlusSeason < MYTHIC_PLUS_SEASONS.SHDW_S1) continue;
        if (onlyLast && mythicPlusSeason !== lastSeason) continue;

        await delay(2);

        const { periods } = await this.BNet.query<any>(
          `/data/wow/mythic-keystone/season/${mythicPlusSeason}`,
          apiConstParams(API_HEADERS_ENUM.DYNAMIC),
        );

        if (onlyLast) {
          const lastWeek = periods[periods.length - 1];
          mythicPlusExpansionWeeks.add(lastWeek.id);
        } else {
          periods.map((period) => mythicPlusExpansionWeeks.add(period.id));
        }
      }

      const w = Array.from(mythicPlusExpansionWeeks).pop();
      const previousWeek = await this.redisService.get(`week:${w}`);
      if (previousWeek) {
        throw new BadGatewayException(`week:${w} already been requested`);
      }

      const realmsEntity = await this.realmsRepository
        .createQueryBuilder('realms')
        .distinctOn(['realms.connectedRealmId'])
        .getMany();

      for (const { connectedRealmId } of realmsEntity) {
        for (const dungeonId of mythicPlusDungeons.keys()) {
          // SHDW Dungeons Breakpoint
          if (dungeonId < 375) continue;
          for (const period of mythicPlusExpansionWeeks.values()) {
            await delay(2);

            const { leading_groups } = await this.BNet.query<any>(
              `/data/wow/connected-realm/${connectedRealmId}/mythic-leaderboard/${dungeonId}/period/${period}`,
              apiConstParams(API_HEADERS_ENUM.DYNAMIC),
            );

            const isSafe = !leading_groups || !Array.isArray(leading_groups);
            if (isSafe) continue;

            for (const group of leading_groups) {
              const characterJobMembers = group.members.map((member) => ({
                name: toGuid(member.profile.name, member.profile.realm.slug),
                data: {
                  guid: toGuid(member.profile.name, member.profile.realm.slug),
                  name: member.profile.name,
                  realm: member.profile.realm.slug,
                  forceUpdate: ms('4h'),
                  region: 'eu',
                  createdBy: OSINT_SOURCE.MYTHIC_PLUS,
                  updatedBy: OSINT_SOURCE.MYTHIC_PLUS,
                  faction: member.faction.type === 'HORDE' ? FACTION.H : FACTION.A,
                  createOnlyUnique: false,
                },
                opts: {
                  jobId: toGuid(member.profile.name, member.profile.realm.slug),
                  priority: 3,
                },
              }));

              await this.queueCharacters.addBulk(characterJobMembers);

              this.logger.log(
                `indexMythicPlusLadder: Realm ${connectedRealmId} | Dungeon ${dungeonId} | Week ${period} | Group ${group.ranking} | Characters: ${characterJobMembers.length}`,
              );
            }
          }
        }
      }

      await this.redisService.set(`week:${w}`, w);
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: 'indexMythicPlusLadder',
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }
}
