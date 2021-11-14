import { BadGatewayException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlizzAPI } from 'blizzapi';
import ms from 'ms';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Key, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import {
  BRACKETS,
  charactersQueue,
  FACTION,
  GLOBAL_OSINT_KEY,
  guildsQueue, IQCharacter,
  IQGuild, MYTHIC_PLUS_SEASONS, OSINT_SOURCE,
  RAID_FACTIONS,
  RAIDS, toSlug,
} from '@app/core';

@Injectable()
export class LadderService implements OnApplicationBootstrap {

  private readonly logger = new Logger(
    LadderService.name, { timestamp: true },
  );

  private BNet: BlizzAPI

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @BullQueueInject(guildsQueue.name)
    private readonly queueGuilds: Queue<IQGuild, number>,
    @BullQueueInject(charactersQueue.name)
    private readonly queueCharacters: Queue<IQCharacter, number>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexHallOfFame(GLOBAL_OSINT_KEY, false);
    await this.indexMythicPlusLadder(GLOBAL_OSINT_KEY, false);
    await this.indexPvpLadder(GLOBAL_OSINT_KEY, false);
  }

  async indexPvpLadder(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast: boolean = true
  ): Promise<void> {
    try {
      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        throw new NotFoundException(`${keys.length} keys found`);
      }

      const [key] = keys;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token
      });

      const { seasons } = await this.BNet.query('/data/wow/pvp-season/index', {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      });

      let i: number = 0;

      for (const season of seasons) {

        if (onlyLast && season.id !== seasons[seasons.length - 1].id) continue;

        for (const bracket of BRACKETS) {
          const { entries } = await this.BNet.query(`data/wow/pvp-season/${season.id}/pvp-leaderboard/${bracket}`, {
            timeout: 10000,
            headers: { 'Battlenet-Namespace': 'dynamic-eu' }
          });

          for (const player of entries) {

            const _id: string = `${toSlug(player.character.name)}@${player.character.realm.slug}`;
            const faction = player.faction.type === 'HORDE' ? FACTION.H : FACTION.A;

            await this.queueCharacters.add(
              _id,
              {
                _id,
                name: player.character.name,
                realm: player.character.realm.slug,
                forceUpdate: ms('4h'),
                region: 'eu',
                clientId: keys[i]._id,
                clientSecret: keys[i].secret,
                accessToken: keys[i].token,
                created_by: OSINT_SOURCE.PVPLADDER,
                updated_by: OSINT_SOURCE.PVPLADDER,
                faction,
                iteration: player.rank,
                guildRank: false,
                createOnlyUnique: false,
              },
              {
                jobId: _id,
                priority: 2
              }
            );

            i++;
            if (i >= keys.length) i = 0;
          }
        }
      }

    } catch (errorException) {
      this.logger.error(`indexPvpLadder: ${errorException}`)
    }
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  async indexMythicPlusLadder(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast: boolean = true
  ): Promise<void> {
    try {
      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        throw new NotFoundException(`${keys.length} keys found`);
      }

      const [key] = keys;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token
      });

      const mythicPlusDungeons: Map<number, string> = new Map([]);
      const mythicPlusSeasons: Set<number> = new Set();
      const mythicPlusExpansionWeeks: Set<number> = new Set();

      const { dungeons } = await this.BNet.query('/data/wow/mythic-keystone/dungeon/index', {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      });

      const { seasons } = await this.BNet.query('/data/wow/mythic-keystone/season/index', {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      });

      dungeons.map(dungeon => mythicPlusDungeons.set(dungeon.id, dungeon.name.en_GB));
      seasons.map(season => mythicPlusSeasons.add(season.id));
      const lastSeason = Array.from(mythicPlusSeasons).pop();

      for (const mythicPlusSeason of mythicPlusSeasons.values()) {

        if (mythicPlusSeason < MYTHIC_PLUS_SEASONS.SHDW_S1) continue;
        if (onlyLast && mythicPlusSeason !== lastSeason) continue;

        const { periods } = await this.BNet.query(`/data/wow/mythic-keystone/season/${mythicPlusSeason}`, {
          timeout: 10000,
          headers: { 'Battlenet-Namespace': 'dynamic-eu' }
        });

        if (onlyLast) {
          const lastWeek = periods[periods.length - 1];
          mythicPlusExpansionWeeks.add(lastWeek.id);
        } else {
          periods.map(period => mythicPlusExpansionWeeks.add(period.id));
        }
      }

      const w = Array.from(mythicPlusExpansionWeeks).pop();
      const previousWeek = await this.redisService.get(`week:${w}`);
      if (previousWeek) {
        throw new BadGatewayException(`week:${w} already been requested`);
      }

      const connectedRealmsIDs = await this.RealmModel.distinct('connected_realm_id');

      let i: number = 0;
      let iteration = 0;

      for (const connectedRealmId of connectedRealmsIDs) {
        for (const dungeonId of mythicPlusDungeons.keys()) {
          // SHDW Dungeons Breakpoint
          if (dungeonId < 375) continue;
          for (const period of mythicPlusExpansionWeeks.values()) {
            const { leading_groups } = await this.BNet.query(`/data/wow/connected-realm/${connectedRealmId}/mythic-leaderboard/${dungeonId}/period/${period}`, {
              timeout: 10000,
              headers: { 'Battlenet-Namespace': 'dynamic-eu' }
            });

            for (const group of leading_groups) {
              for (const member of group.members) {

                const _id = `${toSlug(member.profile.name)}@${member.profile.realm.slug}`;
                const faction = member.faction.type === 'HORDE' ? FACTION.H : FACTION.A;
                iteration += 1;

                await this.queueCharacters.add(
                  _id,
                  {
                    _id,
                    name: member.profile.name,
                    realm: member.profile.realm.slug,
                    forceUpdate: ms('4h'),
                    region: 'eu',
                    clientId: keys[i]._id,
                    clientSecret: keys[i].secret,
                    accessToken: keys[i].token,
                    created_by: OSINT_SOURCE.MYTHICPLUS,
                    updated_by: OSINT_SOURCE.MYTHICPLUS,
                    faction,
                    iteration,
                    guildRank: false,
                    createOnlyUnique: false,
                  },
                  {
                    jobId: _id,
                    priority: 3
                  }
                );

                i++;
                if (i >= keys.length) i = 0;
              }
            }
          }
        }
      }

      await this.redisService.set(`week:${w}`, iteration);
    } catch (errorException) {
      this.logger.error(`indexMythicPlusLadder: ${errorException}`)
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexHallOfFame(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast: boolean = true
  ): Promise<void> {
    try {
      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        throw new NotFoundException(`${keys.length} keys found`);
      }

      const [key] = keys;

      let i: number = 0;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token
      });

      for (const raid of RAIDS) {

        if (onlyLast && raid !== RAIDS[RAIDS.length - 1]) continue;

        for (const raidFaction of RAID_FACTIONS) {
          const { entries } = await this.BNet.query(`/data/wow/leaderboard/hall-of-fame/${raid}/${raidFaction}`, {
            timeout: 10000,
            headers: { 'Battlenet-Namespace': 'dynamic-eu' }
          });

          for (const guild of entries) {
            const _id: string = `${toSlug(guild.name)}@${guild.realm.slug}`;

            const faction = raidFaction === 'HORDE' ? FACTION.H : FACTION.A;

            await this.queueGuilds.add(
              _id,
              {
                _id,
                name: guild.name,
                realm: guild.realm.slug,
                realm_id: guild.realm.id,
                realm_name: guild.realm.name,
                faction,
                created_by: OSINT_SOURCE.TOP100,
                updated_by: OSINT_SOURCE.TOP100,
                region: 'eu',
                clientId: key._id,
                clientSecret: key.secret,
                accessToken: key.token,
                forceUpdate: ms('1h'),
                iteration: guild.rank,
                guildRank: false,
                createOnlyUnique: false,
              },
              {
                jobId: _id,
                priority: 2
              }
            )

            i++;
            if (i >= keys.length) i = 0;
          }
        }
      }

    } catch (errorException) {
      this.logger.error(`indexHallOfFame: ${errorException}`)
    }
  }
}
