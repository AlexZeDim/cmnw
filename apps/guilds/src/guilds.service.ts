import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { GuildsEntity, KeysEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { BlizzAPI, RegionIdOrName } from '@alexzedim/blizzapi';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import ms from 'ms';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  delay,
  FACTION,
  getKeys,
  GLOBAL_OSINT_KEY,
  GuildJobQueue,
  IHallOfFame,
  isEuRegion,
  isHallOfFame,
  notNull,
  OSINT_GUILD_LIMIT,
  OSINT_SOURCE,
  RAID_FACTIONS,
  HALL_OF_FAME_RAIDS,
  toGuid,
} from '@app/core';

@Injectable()
export class GuildsService implements OnApplicationBootstrap {
  private offset = 0;
  private keyEntities: KeysEntity[];
  private BNet: BlizzAPI;
  private readonly logger = new Logger(GuildsService.name, { timestamp: true });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuilds: Queue<GuildJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexHallOfFame(GLOBAL_OSINT_KEY, false);
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async indexGuilds(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      const jobs = await this.queueGuilds.count();
      if (jobs > 1000) {
        throw new Error(`${jobs} jobs found`);
      }

      let guildIteration = 0;
      this.keyEntities = await getKeys(this.keysRepository, clearance, false, true);

      let length = this.keyEntities.length;

      const guilds = await this.guildsRepository.find({
        order: { updatedAt: 'ASC' },
        take: OSINT_GUILD_LIMIT,
        skip: this.offset,
      });

      this.offset = this.offset + OSINT_GUILD_LIMIT;

      await lastValueFrom(
        from(guilds).pipe(
          mergeMap(async (guild) => {
            const { client, secret, token } =
              this.keyEntities[guildIteration % length];

            const guildJobData = {
              ...guild,
              region: <RegionIdOrName>'eu',
              clientId: client,
              clientSecret: secret,
              accessToken: token,
              createdBy: OSINT_SOURCE.GUILD_INDEX,
              updatedBy: OSINT_SOURCE.GUILD_INDEX,
              requestGuildRank: true,
              createOnlyUnique: false,
              forceUpdate: ms('4h'),
              iteration: guildIteration,
            };

            await this.queueGuilds.add(guild.guid, guildJobData, {
              jobId: guild.guid,
              priority: 5,
            });

            guildIteration = guildIteration + 1;
            const isKeyRequest = guildIteration % 1000 == 0;
            if (isKeyRequest) {
              this.keyEntities = await getKeys(this.keysRepository, clearance);
              length = this.keyEntities.length;
            }
          }),
        ),
      );
    } catch (errorOrException) {
      this.logger.error(`indexGuildsFromMongo ${errorOrException}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexHallOfFame(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast = true,
  ): Promise<void> {
    try {
      this.keyEntities = await getKeys(this.keysRepository, clearance, false);
      const [key] = this.keyEntities;

      const length = this.keyEntities.length;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key.client,
        clientSecret: key.secret,
        accessToken: key.token,
      });

      for (const raid of HALL_OF_FAME_RAIDS) {
        const isOnlyLast = onlyLast && raid !== HALL_OF_FAME_RAIDS[HALL_OF_FAME_RAIDS.length - 1];
        if (isOnlyLast) continue;
        await delay(2);

        for (const raidFaction of RAID_FACTIONS) {
          const response = await this.BNet.query<IHallOfFame>(
            `/data/wow/leaderboard/hall-of-fame/${raid}/${raidFaction}`,
            apiConstParams(API_HEADERS_ENUM.DYNAMIC),
          );

          const isEntries = isHallOfFame(response);
          if (!isEntries) continue;

          const guildJobs = response.entries.map((guildEntry, guildIteration ) => {
            const { client, secret, token } =
              this.keyEntities[guildIteration % length];

            const faction = raidFaction === 'HORDE' ? FACTION.H : FACTION.A;

            const isNotEuRegion = !isEuRegion(guildEntry.region);
            if (isNotEuRegion) {
              return null;
            }

            return {
              name: toGuid(guildEntry.guild.name, guildEntry.guild.realm.slug),
              data: {
                clientId: client,
                clientSecret: secret,
                accessToken: token,
                guid: toGuid(guildEntry.guild.name, guildEntry.guild.realm.slug),
                name: guildEntry.guild.name,
                realm: guildEntry.guild.realm.slug,
                realmId: guildEntry.guild.realm.id,
                realmName: guildEntry.guild.realm.name,
                faction: faction,
                createdBy: OSINT_SOURCE.TOP100,
                updatedBy: OSINT_SOURCE.TOP100,
                region: <RegionIdOrName>guildEntry.region,
                forceUpdate: ms('1h'),
                iteration: guildEntry.rank,
                requestGuildRank: true,
                createOnlyUnique: false,
              },
              opts: {
                jobId: toGuid(guildEntry.guild.name, guildEntry.guild.realm.slug),
                priority: 2,
              },
            }
          }).filter(notNull);

          await this.queueGuilds.addBulk(guildJobs);

          this.logger.log(`indexHallOfFame: Raid ${raid} | Faction ${raidFaction} | Guilds ${guildJobs.length}`);
        }
      }
    } catch (errorOrException) {
      this.logger.error(`indexHallOfFame: ${errorOrException}`);
    }
  }
}
