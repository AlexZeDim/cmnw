import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/resources/queues/guilds.queue';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersEntity, GuildsEntity, KeysEntity } from '@app/pg';
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
} from '@app/resources';
import { bufferCount, concatMap } from 'rxjs/operators';
import { osintConfig } from '@app/configuration';

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
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuilds: Queue<GuildJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexGuildCharactersUnique(GLOBAL_OSINT_KEY, osintConfig.isIndexGuildsFromCharacters);
    await this.indexHallOfFame(GLOBAL_OSINT_KEY, false);
  }

  async indexGuildCharactersUnique(
    clearance: string = GLOBAL_OSINT_KEY,
    isIndexGuildsFromCharacters: boolean
  ) {
    const logTag = this.indexGuildCharactersUnique.name;
    let uniqueGuildGuidsCount = 0;
    let guildJobsItx = 0;
    let guildJobsSuccessItx = 0;

    try {
      this.logger.log(`${logTag}: isIndexGuildsFromCharacters ${isIndexGuildsFromCharacters}`)
      if (isIndexGuildsFromCharacters) return;


      this.keyEntities = await getKeys(this.keysRepository, clearance, false, true);

      let length = this.keyEntities.length;

      const uniqueGuildGuids = await this.charactersRepository
        .createQueryBuilder('characters')
        .select('characters.guild_guid', 'guildGuid')
        .distinct(true)
        .getRawMany<Pick<CharactersEntity, 'guildGuid'>>();

      uniqueGuildGuidsCount = uniqueGuildGuids.length;

      this.logger.log(`${logTag}: ${uniqueGuildGuidsCount} unique guilds found`);

      const guildJobs = uniqueGuildGuids.map((guild) => {
        const { client, secret, token } =
          this.keyEntities[guildJobsItx % length];

        const [name, realm] = guild.guildGuid.split('@');
        const guildGuid = guild.guildGuid;

        const guildJobData = {
          name: guildGuid,
          data: {
            clientId: client,
            clientSecret: secret,
            accessToken: token,
            guid: guildGuid,
            name: name,
            realm: realm,
            createdBy: OSINT_SOURCE.GUILD_CHARACTERS_UNIQUE,
            updatedBy: OSINT_SOURCE.GUILD_CHARACTERS_UNIQUE,
            region: <RegionIdOrName>'eu',
            forceUpdate: ms('4h'),
            guildIteration: guildJobsItx,
            createOnlyUnique: false,
          },
          opts: {
            jobId: guildGuid,
            priority: 1,
          },
        }

        guildJobsItx = guildJobsItx + 1;

        return guildJobData;
      });

      this.logger.log(`${logTag}: ${guildJobsItx} jobs created`);

      await lastValueFrom(
        from(guildJobs).pipe(
          bufferCount(500),
          concatMap(async (guildJobsBatch) => {
            try {
              await this.queueGuilds.addBulk(guildJobsBatch);
              this.logger.log(`${logTag}: ${guildJobsSuccessItx} + ${guildJobsBatch.length} of ${guildJobsItx} guild jobs added to queue`);
              guildJobsSuccessItx = guildJobsBatch.length;
            } catch (error) {
              this.logger.error(
                {
                  logTag: 'guildJobsBatch',
                  uniqueGuildGuidsCount,
                  guildJobsItx,
                  guildJobsSuccessItx,
                  error: JSON.stringify(error),
                }
              );
            }
          })
        )
      )

      this.logger.log(`${logTag}: ${guildJobsSuccessItx} of ${guildJobsItx} | ${uniqueGuildGuidsCount} guild jobs added to queue`);
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag,
          uniqueGuildGuidsCount,
          guildJobsItx,
          guildJobsSuccessItx,
          error: errorOrException,
        }
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async indexGuilds(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    const logTag = this.indexGuilds.name;
    try {
      const jobs = await this.queueGuilds.count();
      if (jobs > 1_000) {
        this.logger.warn(`${logTag}: ${jobs} jobs found`);
        return;
      }

      const globalConcurrency = await this.queueGuilds.getGlobalConcurrency();
      const updatedConcurrency = await this.queueGuilds.setGlobalConcurrency(10);

      this.logger.log(`${guildsQueue.name}: globalConcurrency: ${globalConcurrency} | updatedConcurrency: ${updatedConcurrency}`);

      let guildIteration = 0;
      this.keyEntities = await getKeys(this.keysRepository, clearance, false, true);

      let length = this.keyEntities.length;

      const guilds = await this.guildsRepository.find({
        order: { updatedAt: 'ASC' },
        take: OSINT_GUILD_LIMIT,
        skip: this.offset,
      });

      const isRotate = false;
      const guildsCount = await this.guildsRepository.count();
      this.offset = this.offset + (isRotate ? OSINT_GUILD_LIMIT : 0);

      if (this.offset >= guildsCount) {
        this.logger.warn(`${logTag}: END_OF offset ${this.offset} >= guildsCount ${guildsCount}`);
        this.offset = 0;
      }

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
              createOnlyUnique: false,
              forceUpdate: ms('4h'),
              iteration: guildIteration,
            };

            await this.queueGuilds.add(guild.guid, guildJobData, {
              jobId: guild.guid,
              priority: 5,
            });

            guildIteration = guildIteration + 1;
            const isKeyRequest = guildIteration % 100 == 0;
            if (isKeyRequest) {
              this.keyEntities = await getKeys(this.keysRepository, clearance);
              length = this.keyEntities.length;
            }
          }),
        ),
      );

      this.logger.log(`${logTag}: offset ${this.offset} | ${guilds.length} characters`);
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: logTag,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexHallOfFame(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast = true,
  ): Promise<void> {
    const logTag = this.indexHallOfFame.name;

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
                createOnlyUnique: false,
              },
              opts: {
                jobId: toGuid(guildEntry.guild.name, guildEntry.guild.realm.slug),
                priority: 2,
              },
            }
          }).filter(notNull);

          await this.queueGuilds.addBulk(guildJobs);

          this.logger.log(`${logTag}: Raid ${raid} | Faction ${raidFaction} | Guilds ${guildJobs.length}`);
        }
      }
    } catch (errorOrException) {
      this.logger.error(
        {
          logTag: logTag,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }
}
